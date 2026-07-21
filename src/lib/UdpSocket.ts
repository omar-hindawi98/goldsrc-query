import * as dgram from 'dgram';
import { BufferExt } from './BufferExt';
import { Latency } from './Latency';
import { UDP_PACKET, UDP_RESPONSE } from './constants';
import { parseServerInfo, parseServerInfoAdditional } from '../handlers/serverInfo';
import { parsePlayers } from '../handlers/players';
import { parseRules } from '../handlers/rules';
import type { ServerInfo, PlayerInfo, RulesInfo } from '../types';

export class UdpSocket {
    private readonly address: string;
    private readonly port: number;
    private readonly timeout: number;
    private readonly verbose: boolean;

    private socket?: dgram.Socket;
    private challenge: Buffer | null = null;

    constructor(address: string, port: number, timeout: number, verbose: boolean) {
        this.address = address;
        this.port = port;
        this.timeout = timeout;
        this.verbose = verbose;
    }

    open(): void {
        if (this.verbose) console.log('UDP socket created');
        this.socket = dgram.createSocket('udp4');
        this.socket.on('error', (err) => {
            throw err;
        });
    }

    close(): void {
        this.socket?.close();
    }

    private ensureOpen(): void {
        if (!this.socket) throw new Error('Socket not open — call connect() first');
    }

    ping(): Promise<number> {
        if (this.verbose) console.log('QUERY - PING');
        this.ensureOpen();
        const latency = new Latency();
        latency.start();
        this.send(UDP_PACKET.A2S_INFO);
        return this.once<number>([UDP_RESPONSE.A2S_INFO, UDP_RESPONSE.A2S_INFO_ADDITIONAL], () => {
            latency.stop();
            return latency.difference();
        });
    }

    serverInfo(): Promise<ServerInfo> {
        if (this.verbose) console.log('QUERY - SERVER_INFO');
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
        if (this.verbose) console.log('QUERY - PLAYERS');
        this.send(UDP_PACKET.A2S_PLAYER, challenge);
        return this.once<PlayerInfo[]>(UDP_RESPONSE.A2S_PLAYER, (_, data) => parsePlayers(data));
    }

    async rules(): Promise<RulesInfo> {
        this.ensureOpen();
        const challenge = await this.withChallenge();
        if (this.verbose) console.log('QUERY - RULES');
        this.send(UDP_PACKET.A2S_RULES, challenge);
        return this.once<RulesInfo>(UDP_RESPONSE.A2S_RULES, (_, data) => parseRules(data));
    }

    private async withChallenge(): Promise<Buffer> {
        if (this.challenge !== null) return this.challenge;

        if (this.verbose) console.log('QUERY - CHALLENGE');
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
        return this.challenge;
    }

    private send(packet: number[], suffix?: Buffer): void {
        const buf = suffix ? Buffer.concat([Buffer.from(packet), suffix]) : Buffer.from(packet);
        this.socket!.send(buf, this.port, this.address);
    }

    // Reassemble split UDP responses (0xFFFFFFFE multi-packet format).
    // Returns the merged payload with the split header stripped, or null if
    // the packet is a single-packet response (0xFFFFFFFF) — returned as-is.
    private reassemble(msg: Buffer, pending: Map<number, Buffer[]>): Buffer | null {
        const prefix = msg.readInt32LE(0);

        if (prefix === -1) {
            // Single-packet response — strip the 4-byte header and return.
            return msg.slice(4);
        }

        if (prefix === -2) {
            // Split-packet response header:
            //   id(4) total(1) number(1) size(2) [compressed flag in id high-bit for Source]
            const id = msg.readInt32LE(4);
            const total = msg[8];
            const number = msg[9];
            // Byte 10-11 is packet size (unused — we just concatenate in order).
            const payload = msg.slice(12);

            if (!pending.has(id)) pending.set(id, new Array(total).fill(null));
            pending.get(id)![number] = payload;

            const parts = pending.get(id)!;
            if (parts.some((p) => p === null)) return null; // still waiting for more

            pending.delete(id);
            return Buffer.concat(parts);
        }

        return null;
    }

    private once<T>(
        expectedHeader: number | number[],
        parse: (header: number, data: BufferExt) => T,
    ): Promise<T> {
        const headers = Array.isArray(expectedHeader) ? expectedHeader : [expectedHeader];
        // Accumulates split-packet fragments keyed by request id.
        const splitPending = new Map<number, Buffer[]>();

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.socket!.removeListener('message', onMessage);
                reject(
                    new Error(
                        `Timed out waiting for 0x${headers.map((h) => h.toString(16)).join('/0x')}`,
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
                this.socket!.removeListener('message', onMessage);

                try {
                    resolve(parse(header, buf));
                } catch (err) {
                    reject(err);
                }
            };

            this.socket!.on('message', onMessage);
        });
    }
}
