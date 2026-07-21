import * as net from 'net';
import { BufferExt } from './BufferExt';
import { TCP_PACKET, TCP_RESPONSE } from './constants';
import type { RconMessage } from '../types';

type PendingRcon = {
    resolve: (msg: RconMessage) => void;
    reject: (err: Error) => void;
    body: string;
};

export class RconClient {
    private readonly address: string;
    private readonly port: number;
    private readonly timeout: number;
    private readonly verbose: boolean;

    private socket?: net.Socket;
    private idSequence = 0;
    private pending = new Map<number, PendingRcon>();
    // Leftover bytes from a partial TCP delivery.
    private tcpBuffer = Buffer.alloc(0);

    constructor(address: string, port: number, timeout: number, verbose: boolean) {
        this.address = address;
        this.port = port;
        this.timeout = timeout;
        this.verbose = verbose;
    }

    connect(password: string): Promise<void> {
        this.tcpBuffer = Buffer.alloc(0);
        this.socket = new net.Socket();

        return new Promise((resolve, reject) => {
            this.socket!.connect(this.port, this.address, () => {
                if (this.verbose) console.log('Connected via TCP/IP');
                this.authenticate(password).then(resolve).catch(reject);
            });
            this.socket!.on('error', reject);
        });
    }

    send(msg: string): Promise<RconMessage> {
        return new Promise((resolve, reject) => {
            const [cmdPacket, id] = this.createPacket(TCP_PACKET.SERVERDATA_EXECCOMMAND, msg);
            // Send a second empty EXECCOMMAND with a sentinel ID (id+1).
            // When we see a RESPONSE_VALUE for the sentinel, we know the real
            // response is complete — all packets with id have arrived.
            const [sentinelPacket] = this.createPacket(TCP_PACKET.SERVERDATA_EXECCOMMAND, '');
            const sentinelId = id + 1;

            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.pending.delete(sentinelId);
                reject(new Error(`RCON command timed out: ${msg}`));
            }, this.timeout);

            const done = (response: RconMessage) => {
                clearTimeout(timer);
                this.pending.delete(sentinelId);
                resolve(response);
            };

            this.pending.set(id, {
                resolve: done,
                reject: (err) => {
                    clearTimeout(timer);
                    reject(err);
                },
                body: '',
            });

            // Sentinel entry — signals end-of-response when we receive it.
            this.pending.set(sentinelId, {
                resolve: () => {
                    const entry = this.pending.get(id);
                    if (entry) {
                        this.pending.delete(id);
                        entry.resolve({ id, data: entry.body });
                    }
                },
                reject: () => {},
                body: '',
            });

            this.socket!.write(cmdPacket);
            this.socket!.write(sentinelPacket);
        });
    }

    close(): void {
        this.tcpBuffer = Buffer.alloc(0);
        this.socket?.destroy();
    }

    private authenticate(password: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const [packet, id] = this.createPacket(TCP_PACKET.SERVERDATA_AUTH, password);

            const timer = setTimeout(() => {
                reject(new Error('RCON authentication timed out'));
            }, this.timeout);

            const onData = (data: Buffer) => {
                this.tcpBuffer = Buffer.concat([this.tcpBuffer, data]);

                while (this.tcpBuffer.length >= 4) {
                    const packetSize = this.tcpBuffer.readInt32LE(0);
                    if (this.tcpBuffer.length < 4 + packetSize) break;

                    const buf = new BufferExt(this.tcpBuffer.slice(4, 4 + packetSize));
                    this.tcpBuffer = this.tcpBuffer.slice(4 + packetSize);

                    const responseId = buf.readLong() as number;
                    const header = buf.readLong() as number;

                    // Auth response comes as RESPONSE_VALUE first, then AUTH_RESPONSE.
                    // We only care about the AUTH_RESPONSE packet.
                    if (header !== TCP_RESPONSE.SERVERDATA_AUTH_RESPONSE) continue;

                    clearTimeout(timer);
                    this.socket!.removeListener('data', onData);
                    this.socket!.on('data', (d: Buffer) => this.onData(d));

                    if (responseId === -1 || responseId !== id) {
                        reject(new Error('RCON authentication failed: wrong password'));
                    } else {
                        resolve();
                    }
                    return;
                }
            };

            this.socket!.on('data', onData);
            this.socket!.write(packet);
        });
    }

    private onData(data: Buffer): void {
        // TCP can deliver partial packets — buffer until we have a complete one.
        this.tcpBuffer = Buffer.concat([this.tcpBuffer, data]);

        while (this.tcpBuffer.length >= 4) {
            const packetSize = this.tcpBuffer.readInt32LE(0);
            if (this.tcpBuffer.length < 4 + packetSize) break; // incomplete packet

            const buf = new BufferExt(this.tcpBuffer.slice(4, 4 + packetSize));
            this.tcpBuffer = this.tcpBuffer.slice(4 + packetSize);

            const id = buf.readLong() as number;
            const header = buf.readLong() as number;

            if (header !== TCP_RESPONSE.SERVERDATA_RESPONSE_VALUE) continue;

            const entry = this.pending.get(id);
            if (!entry) continue;

            // Accumulate body; sentinel will trigger resolution.
            entry.body += buf.readString();
            // Trigger the sentinel immediately if this is the sentinel packet.
            entry.resolve({ id, data: entry.body });
        }
    }

    private createPacket(type: number, text: string): [Buffer, number] {
        // RCON packet: size(4) + id(4) + type(4) + body + null + empty-string null
        const packetSize = 4 + 4 + text.length + 1 + 1;
        const packet = Buffer.allocUnsafe(4 + packetSize);
        packet.writeUInt32LE(packetSize, 0);
        packet.writeUInt32LE(this.idSequence, 4);
        packet.writeUInt32LE(type, 8);
        packet.write(text, 12, 'utf8');
        packet.writeUInt8(0, 12 + text.length);
        packet.writeUInt8(0, 12 + text.length + 1);

        return [packet, this.idSequence++];
    }
}
