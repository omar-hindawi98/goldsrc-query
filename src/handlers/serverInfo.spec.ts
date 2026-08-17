import {
	buildPacket,
	writeBigUInt64LE,
	writeByte,
	writeLong,
	writeShort,
	writeString,
} from "../../tests/helpers/packetHelpers";
import { parseServerInfo, parseServerInfoAdditional } from "./serverInfo";

describe("parseServerInfo", () => {
	function makePacket(mod = 0) {
		const strings = [
			"127.0.0.1:27015",
			"Test Server",
			"de_dust2",
			"cstrike",
			"Counter-Strike",
		];
		const size = strings.reduce((s, v) => s + v.length + 1, 0) + 9;
		return buildPacket((buf, off) => {
			strings.forEach((s) => void writeString(buf, off, s));
			writeByte(buf, off, 12); // players
			writeByte(buf, off, 32); // max_players
			writeByte(buf, off, 47); // protocol
			writeByte(buf, off, 0x64); // server_type 'd'
			writeByte(buf, off, 0x6c); // env 'l'
			writeByte(buf, off, 0); // visibility
			writeByte(buf, off, mod); // mod flag
			writeByte(buf, off, 1); // vac
			writeByte(buf, off, 2); // bots
		}, size);
	}

	it("parses all base fields correctly", () => {
		const result = parseServerInfo(makePacket());
		expect(result.address).toBe("127.0.0.1:27015");
		expect(result.name).toBe("Test Server");
		expect(result.map).toBe("de_dust2");
		expect(result.folder).toBe("cstrike");
		expect(result.game).toBe("Counter-Strike");
		expect(result.players).toBe(12);
		expect(result.max_players).toBe(32);
		expect(result.protocol).toBe(47);
		expect(result.server_type).toBe("d");
		expect(result.env).toBe("l");
		expect(result.visibility).toBe(0);
		expect(result.vac).toBe(1);
		expect(result.bots).toBe(2);
	});

	it("mod_info.mod is 0 when no mod is active", () => {
		expect(parseServerInfo(makePacket(0)).mod_info?.mod).toBe(0);
	});

	it("parses mod fields when mod flag is 1", () => {
		const link = "http://mod.example.com";
		const dlLink = "http://dl.example.com";
		const baseStrings = ["127.0.0.1:27015", "Server", "map", "folder", "game"];
		const size =
			baseStrings.reduce((s, v) => s + v.length + 1, 0) +
			7 + // players..mod flag
			(link.length + 1) +
			(dlLink.length + 1) +
			1 +
			4 +
			4 +
			1 +
			1 + // mod fields
			2; // vac + bots
		const data = buildPacket((buf, off) => {
			baseStrings.forEach((s) => void writeString(buf, off, s));
			writeByte(buf, off, 5);
			writeByte(buf, off, 20);
			writeByte(buf, off, 47);
			writeByte(buf, off, 0x64);
			writeByte(buf, off, 0x6c);
			writeByte(buf, off, 0);
			writeByte(buf, off, 1); // mod = 1
			writeString(buf, off, link);
			writeString(buf, off, dlLink);
			writeByte(buf, off, 0x00); // null byte
			writeLong(buf, off, 100); // version
			writeLong(buf, off, 52428800); // size
			writeByte(buf, off, 0); // type
			writeByte(buf, off, 1); // dll
			writeByte(buf, off, 1); // vac
			writeByte(buf, off, 0); // bots
		}, size);

		const result = parseServerInfo(data);
		expect(result.mod_info?.mod).toBe(1);
		expect(result.mod_info?.link).toBe(link);
		expect(result.mod_info?.dl_link).toBe(dlLink);
		expect(result.mod_info?.version).toBe(100);
		expect(result.mod_info?.size).toBe(52428800);
		expect(result.mod_info?.dll).toBe(1);
	});
});

describe("parseServerInfoAdditional", () => {
	function makePacket(edf = 0x00) {
		const strings = ["Test Server", "de_dust2", "cstrike", "Counter-Strike"];
		const version = "1.0.0.0";
		const size =
			strings.reduce((s, v) => s + v.length + 1, 0) +
			1 +
			2 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 + // protocol..vac
			(version.length + 1) +
			1 +
			16; // version + edf + EDF slack
		return buildPacket((buf, off) => {
			writeByte(buf, off, 47);
			strings.forEach((s) => void writeString(buf, off, s));
			writeShort(buf, off, 440);
			writeByte(buf, off, 24);
			writeByte(buf, off, 32);
			writeByte(buf, off, 0);
			writeByte(buf, off, 0x64);
			writeByte(buf, off, 0x6c);
			writeByte(buf, off, 0);
			writeByte(buf, off, 1);
			writeString(buf, off, version);
			writeByte(buf, off, edf);
		}, size);
	}

	it("parses base fields correctly", () => {
		const result = parseServerInfoAdditional(makePacket());
		expect(result.protocol).toBe(47);
		expect(result.name).toBe("Test Server");
		expect(result.map).toBe("de_dust2");
		expect(result.game_id).toBe(440);
		expect(result.players).toBe(24);
		expect(result.max_players).toBe(32);
		expect(result.vac).toBe(1);
		expect(result.version).toBe("1.0.0.0");
	});

	it("parses server_port when EDF 0x80 is set", () => {
		const strings = ["Server", "map", "folder", "game"];
		const version = "1.0";
		const size =
			1 +
			strings.reduce((s, v) => s + v.length + 1, 0) +
			2 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			(version.length + 1) +
			1 +
			2;
		const data = buildPacket((buf, off) => {
			writeByte(buf, off, 47);
			strings.forEach((s) => void writeString(buf, off, s));
			writeShort(buf, off, 730);
			writeByte(buf, off, 10);
			writeByte(buf, off, 20);
			writeByte(buf, off, 0);
			writeByte(buf, off, 0x64);
			writeByte(buf, off, 0x6c);
			writeByte(buf, off, 0);
			writeByte(buf, off, 1);
			writeString(buf, off, version);
			writeByte(buf, off, 0x80);
			writeShort(buf, off, 27015);
		}, size);
		expect(parseServerInfoAdditional(data).server_port).toBe(27015);
	});

	it("parses steamid (EDF 0x10) as bigint", () => {
		const strings = ["Server", "map", "folder", "game"];
		const version = "1.0";
		const steamid = 76561198012345678n;
		const size =
			1 +
			strings.reduce((s, v) => s + v.length + 1, 0) +
			2 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			(version.length + 1) +
			1 +
			8;
		const data = buildPacket((buf, off) => {
			writeByte(buf, off, 47);
			strings.forEach((s) => void writeString(buf, off, s));
			writeShort(buf, off, 730);
			writeByte(buf, off, 10);
			writeByte(buf, off, 20);
			writeByte(buf, off, 0);
			writeByte(buf, off, 0x64);
			writeByte(buf, off, 0x6c);
			writeByte(buf, off, 0);
			writeByte(buf, off, 1);
			writeString(buf, off, version);
			writeByte(buf, off, 0x10); // EDF: steamid present
			writeBigUInt64LE(buf, off, steamid);
		}, size);
		expect(parseServerInfoAdditional(data).steamid).toBe(steamid);
	});

	it("parses game_id_64 (EDF 0x01) as bigint", () => {
		const strings = ["Server", "map", "folder", "game"];
		const version = "1.0";
		const gameId = 440n;
		const size =
			1 +
			strings.reduce((s, v) => s + v.length + 1, 0) +
			2 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			1 +
			(version.length + 1) +
			1 +
			8;
		const data = buildPacket((buf, off) => {
			writeByte(buf, off, 47);
			strings.forEach((s) => void writeString(buf, off, s));
			writeShort(buf, off, 730);
			writeByte(buf, off, 10);
			writeByte(buf, off, 20);
			writeByte(buf, off, 0);
			writeByte(buf, off, 0x64);
			writeByte(buf, off, 0x6c);
			writeByte(buf, off, 0);
			writeByte(buf, off, 1);
			writeString(buf, off, version);
			writeByte(buf, off, 0x01); // EDF: game_id_64 present
			writeBigUInt64LE(buf, off, gameId);
		}, size);
		expect(parseServerInfoAdditional(data).game_id_64).toBe(gameId);
	});
});
