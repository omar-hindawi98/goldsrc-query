import { RconClient } from "./lib/RconClient";
import { UdpSocket } from "./lib/UdpSocket";
import type { PlayerInfo, RconMessage, RulesInfo, ServerInfo } from "./types";

export class Query {
	private readonly udp: UdpSocket;
	private readonly rcon: RconClient;

	constructor(address: string, port = 27015, timeout = 1500, verbose = false) {
		this.udp = new UdpSocket(address, port, timeout, verbose);
		this.rcon = new RconClient(address, port, timeout, verbose);
	}

	// UDP

	connect(): void {
		this.udp.open();
	}
	ping(): Promise<number> {
		return this.udp.ping();
	}
	serverInfo(): Promise<ServerInfo> {
		return this.udp.serverInfo();
	}
	players(): Promise<PlayerInfo[]> {
		return this.udp.players();
	}
	rules(): Promise<RulesInfo> {
		return this.udp.rules();
	}

	// RCON

	connectRcon(password: string): Promise<void> {
		return this.rcon.connect(password);
	}
	sendRcon(msg: string): Promise<RconMessage> {
		return this.rcon.send(msg);
	}

	// Lifecycle

	close(): void {
		this.udp.close();
		this.rcon.close();
	}
}
