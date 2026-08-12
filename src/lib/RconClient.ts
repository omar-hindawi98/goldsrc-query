import * as dgram from "node:dgram";
import type { RconMessage } from "../types";

// GoldSrc RCON uses UDP, not TCP.
// Protocol:
//   1. Send: \xFF\xFF\xFF\xFF challenge rcon\n
//   2. Recv: \xFF\xFF\xFF\xFF challenge rcon <number>\n
//   3. Send: \xFF\xFF\xFF\xFF rcon <number> "<password>" <command>\n
//   4. Recv: \xFF\xFF\xFF\xFF l<text>  (0x6c prefix byte)

const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff]);
const RESPONSE_HEADER_LEN = 5; // 4-byte FF prefix + 1-byte type ('l')

export class RconClient {
	private readonly address: string;
	private readonly port: number;
	private readonly timeout: number;

	private socket?: dgram.Socket;
	private challenge?: string;
	private password?: string;

	constructor(
		address: string,
		port: number,
		timeout: number,
		_verbose: boolean,
	) {
		this.address = address;
		this.port = port;
		this.timeout = timeout;
	}

	connect(password: string): Promise<void> {
		this.password = password;
		this.socket = dgram.createSocket("udp4");

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.socket?.removeAllListeners();
				reject(new Error("RCON authentication timed out"));
			}, this.timeout);

			const onMessage = (msg: Buffer) => {
				// Challenge response: \xFF\xFF\xFF\xFF challenge rcon <number>\n
				if (!msg.slice(0, 4).equals(HEADER)) return;
				const text = msg.slice(4).toString("utf8").trim();

				if (text.startsWith("challenge rcon ")) {
					this.challenge = text.slice("challenge rcon ".length).trim();
					clearTimeout(timer);
					this.socket?.removeListener("message", onMessage);
					// Verify the password by sending a no-op command (empty string).
					this.verifyPassword(password).then(resolve).catch(reject);
					return;
				}
			};

			this.socket?.on("message", onMessage);
			this.socket?.on("error", (err) => {
				clearTimeout(timer);
				reject(err);
			});

			this.sendRaw("challenge rcon\n");
		});
	}

	send(command: string): Promise<RconMessage> {
		if (!this.challenge || !this.password) {
			return Promise.reject(
				new Error("RCON not connected - call connectRcon() first"),
			);
		}
		return this.execCommand(command, this.challenge, this.password);
	}

	close(): void {
		this.socket?.close();
		this.socket = undefined;
		this.challenge = undefined;
		this.password = undefined;
	}

	private verifyPassword(password: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.challenge) {
				reject(new Error("No RCON challenge available"));
				return;
			}

			const timer = setTimeout(() => {
				this.socket?.removeAllListeners("message");
				reject(new Error("RCON authentication timed out"));
			}, this.timeout);

			const onMessage = (msg: Buffer) => {
				if (!msg.slice(0, 4).equals(HEADER)) return;
				if (msg[4] !== 0x6c) return; // not an 'l' response packet

				const text = msg.slice(RESPONSE_HEADER_LEN).toString("utf8").trim();
				clearTimeout(timer);
				this.socket?.removeListener("message", onMessage);

				if (
					text.toLowerCase().includes("bad rcon_password") ||
					text.toLowerCase().includes("bad password")
				) {
					reject(new Error("RCON authentication failed"));
				} else {
					resolve();
				}
			};

			this.socket?.on("message", onMessage);
			// Send a benign command that always produces a server response.
			// An empty command may produce no UDP reply at all; "version" is safe
			// and reliably returns one packet ending with \n.
			this.sendRaw(`rcon ${this.challenge} "${password}" version\n`);
		});
	}

	private execCommand(
		command: string,
		challenge: string,
		password: string,
	): Promise<RconMessage> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.socket?.removeAllListeners("message");
				reject(new Error(`RCON command timed out: ${command}`));
			}, this.timeout);

			let accumulated = "";

			const onMessage = (msg: Buffer) => {
				if (!msg.slice(0, 4).equals(HEADER)) return;
				if (msg[4] !== 0x6c) return;

				const chunk = msg.slice(RESPONSE_HEADER_LEN).toString("utf8");
				accumulated += chunk;

				// GoldSrc sends one or more UDP packets per command response.
				// A trailing \n on the last packet signals end-of-response.
				if (chunk.endsWith("\n") || chunk.endsWith("\0")) {
					clearTimeout(timer);
					this.socket?.removeListener("message", onMessage);
					resolve({ id: 0, data: accumulated.trim() });
				}
			};

			this.socket?.on("message", onMessage);
			this.sendRaw(`rcon ${challenge} "${password}" ${command}\n`);
		});
	}

	private sendRaw(text: string): void {
		const payload = Buffer.concat([HEADER, Buffer.from(text, "utf8")]);
		this.socket?.send(payload, this.port, this.address);
	}
}
