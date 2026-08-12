import * as dgram from "node:dgram";
import { parsePlayers } from "../handlers/players";
import { parseRules } from "../handlers/rules";
import {
	parseServerInfo,
	parseServerInfoAdditional,
} from "../handlers/serverInfo";
import type { PlayerInfo, RulesInfo, ServerInfo } from "../types";
import { BufferExt } from "./BufferExt";
import { UDP_PACKET, UDP_RESPONSE } from "./constants";
import { Latency } from "./Latency";

export class UdpSocket {
	private readonly address: string;
	private readonly port: number;
	private readonly timeout: number;
	private readonly log?: (msg: string) => void;

	private socket?: dgram.Socket;
	private challenge: Buffer | null = null;
	private challengeExpiry = 0;
	private static readonly CHALLENGE_TTL_MS = 5 * 60 * 1000;
	private static readonly MAX_SPLIT_PACKETS = 16;
	private static readonly MAX_SPLIT_PACKET_ID = 0xffff;

	constructor(
		address: string,
		port: number,
		timeout: number,
		log?: (msg: string) => void,
	) {
		this.address = address;
		this.port = port;
		this.timeout = timeout;
		this.log = log;
	}

	open(): void {
		if (this.socket) return;
		this.log?.("UDP socket created");
		this.socket = dgram.createSocket("udp4");
		this.socket.on("error", (err) => {
			throw err;
		});
	}

	close(): void {
		this.socket?.close();
		this.socket = undefined;
		this.challenge = null;
		this.challengeExpiry = 0;
	}

	private ensureOpen(): void {
		if (!this.socket) throw new Error("Socket not open — call connect() first");
	}

	ping(): Promise<number> {
		this.log?.("QUERY - PING");
		this.ensureOpen();
		const latency = new Latency();
		latency.start();
		this.send(UDP_PACKET.A2S_INFO);
		return this.once<number>(
			[UDP_RESPONSE.A2S_INFO, UDP_RESPONSE.A2S_INFO_ADDITIONAL],
			() => {
				latency.stop();
				return latency.difference();
			},
		);
	}

	serverInfo(): Promise<ServerInfo> {
		this.log?.("QUERY - SERVER_INFO");
		this.ensureOpen();
		this.send(UDP_PACKET.A2S_INFO);
		return this.once<ServerInfo>(
			[UDP_RESPONSE.A2S_INFO, UDP_RESPONSE.A2S_INFO_ADDITIONAL],
			(header, data) =>
				header === UDP_RESPONSE.A2S_INFO
					? parseServerInfo(data)
					: parseServerInfoAdditional(data),
		);
	}

	async players(): Promise<PlayerInfo[]> {
		this.ensureOpen();
		const challenge = await this.withChallenge();
		this.log?.("QUERY - PLAYERS");
		this.send(UDP_PACKET.A2S_PLAYER, challenge);
		return this.once<PlayerInfo[]>(UDP_RESPONSE.A2S_PLAYER, (_, data) =>
			parsePlayers(data),
		);
	}

	async rules(): Promise<RulesInfo> {
		this.ensureOpen();
		let challenge = await this.withChallenge();
		this.log?.("QUERY - RULES");
		this.send(UDP_PACKET.A2S_RULES, challenge);

		const response = await this.once<{ header: number; data: BufferExt }>(
			[UDP_RESPONSE.A2S_RULES, UDP_RESPONSE.A2S_SERVERQUERY_GETCHALLENGE],
			(header, data) => ({ header, data }),
		);

		if (response.header === UDP_RESPONSE.A2S_SERVERQUERY_GETCHALLENGE) {
			// Server issued a fresh challenge for the rules request — update cache
			// and retry once.
			challenge = response.data.readLong(true) as Buffer;
			this.challenge = challenge;
			this.challengeExpiry = Date.now() + UdpSocket.CHALLENGE_TTL_MS;
			this.log?.("QUERY - RULES (retry after re-challenge)");
			this.send(UDP_PACKET.A2S_RULES, challenge);
			return this.once<RulesInfo>(UDP_RESPONSE.A2S_RULES, (_, data) =>
				parseRules(data),
			);
		}

		return parseRules(response.data);
	}

	private async withChallenge(): Promise<Buffer> {
		if (this.challenge !== null && Date.now() < this.challengeExpiry) {
			return this.challenge;
		}

		this.log?.("QUERY - CHALLENGE");
		this.send(UDP_PACKET.A2S_PLAYER_CHALLENGE);
		this.challenge = await this.once<Buffer>(
			UDP_RESPONSE.A2S_SERVERQUERY_GETCHALLENGE,
			(_, data) => {
				const bytes = data.readLong(true) as Buffer;
				// Some servers respond with 0xFFFFFFFF meaning no challenge needed.
				// Return it as-is; the caller will include it in the next request and
				// the server will accept it.
				return bytes;
			},
		);
		this.challengeExpiry = Date.now() + UdpSocket.CHALLENGE_TTL_MS;
		return this.challenge;
	}

	private send(packet: number[], suffix?: Buffer): void {
		const buf = suffix
			? Buffer.concat([Buffer.from(packet), suffix])
			: Buffer.from(packet);
		this.socket?.send(buf, this.port, this.address);
	}

	// Reassemble split UDP responses (0xFFFFFFFE multi-packet format).
	// Returns the merged payload with the split header stripped, or null if
	// the packet is a single-packet response (0xFFFFFFFF) — returned as-is.
	private reassemble(
		msg: Buffer,
		pending: Map<number, Buffer[]>,
	): Buffer | null {
		const prefix = msg.readInt32LE(0);

		if (prefix === -1) {
			// Single-packet response — strip the 4-byte header and return.
			return msg.slice(4);
		}

		if (prefix === -2) {
			// GoldSrc split-packet response header (9 bytes total):
			//   prefix(4) id(4) packed(1)
			// packed byte: upper nibble = fragment index (0-based), lower nibble = total
			// Fragment data starts at byte 9 and includes the inner 0xFFFFFFFF prefix
			// on the first fragment; after reassembly we recurse to strip that prefix.
			const id = msg.readInt32LE(4);
			const packed = msg[8];
			const total = packed & 0x0f;
			const number = (packed >> 4) & 0x0f;

			if (
				id < 0 ||
				id > UdpSocket.MAX_SPLIT_PACKET_ID ||
				total < 1 ||
				total > UdpSocket.MAX_SPLIT_PACKETS ||
				number >= total
			) {
				return null;
			}

			const payload = msg.slice(9);

			if (!pending.has(id)) pending.set(id, new Array(total).fill(null));
			const parts = pending.get(id) as Buffer[];
			parts[number] = payload;
			if (parts.some((p) => p === null)) return null; // still waiting for more

			pending.delete(id);
			// The assembled buffer is the original response (starts with 0xFFFFFFFF).
			// Recurse to strip that inner header and return the bare payload.
			return this.reassemble(Buffer.concat(parts), pending);
		}

		return null;
	}

	private once<T>(
		expectedHeader: number | number[],
		parse: (header: number, data: BufferExt) => T,
	): Promise<T> {
		const headers = Array.isArray(expectedHeader)
			? expectedHeader
			: [expectedHeader];
		// Accumulates split-packet fragments keyed by request id.
		const splitPending = new Map<number, Buffer[]>();

		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.socket?.removeListener("message", onMessage);
				reject(
					new Error(
						`Timed out waiting for 0x${headers.map((h) => h.toString(16)).join("/0x")}`,
					),
				);
			}, this.timeout);

			const onMessage = (msg: Buffer) => {
				const payload = this.reassemble(msg, splitPending);
				if (payload === null) return; // fragment received, waiting for the rest

				const buf = new BufferExt(payload);
				const header = buf.readByte() as number;

				if (!headers.includes(header)) return;

				clearTimeout(timer);
				this.socket?.removeListener("message", onMessage);

				try {
					resolve(parse(header, buf));
				} catch (err) {
					reject(err);
				}
			};

			this.socket?.setMaxListeners(0);
			this.socket?.on("message", onMessage);
		});
	}
}
