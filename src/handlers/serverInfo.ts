import type { BufferExt } from "../lib/BufferExt";
import type { ModInfo, ServerInfo } from "../types";

export function parseServerInfo(data: BufferExt): ServerInfo {
	// Fields read in strict GoldSrc packet order — do not reorder.
	const address = data.readString();
	const name = data.readString();
	const map = data.readString();
	const folder = data.readString();
	const game = data.readString();
	const players = data.readByte() as number;
	const max_players = data.readByte() as number;
	const protocol = data.readByte() as number;
	const server_type = data.readByte(true) as string;
	const env = data.readByte(true) as string;
	const visibility = data.readByte() as number;

	const mod_info: ModInfo = {
		mod: data.readByte() as number,
		link: null,
		dl_link: null,
		version: null,
		size: null,
		type: null,
		dll: null,
	};

	if (mod_info.mod === 1) {
		mod_info.link = data.readString();
		mod_info.dl_link = data.readString();
		data.readByte(); // null byte
		mod_info.version = data.readLong() as number;
		mod_info.size = data.readLong() as number;
		mod_info.type = data.readByte() as number;
		mod_info.dll = data.readByte() as number;
	}

	return {
		address,
		name,
		map,
		folder,
		game,
		players,
		max_players,
		protocol,
		server_type,
		env,
		visibility,
		mod_info,
		vac: data.readByte() as number,
		bots: data.readByte() as number,
	};
}

export function parseServerInfoAdditional(data: BufferExt): ServerInfo {
	const info: ServerInfo = {
		protocol: data.readByte() as number,
		name: data.readString(),
		map: data.readString(),
		folder: data.readString(),
		game: data.readString(),
		game_id: data.readShort() as number,
		players: data.readByte() as number,
		max_players: data.readByte() as number,
		bots: data.readByte() as number,
		server_type: data.readByte(true) as string,
		env: data.readByte(true) as string,
		visibility: data.readByte() as number,
		vac: data.readByte() as number,
		version: data.readString(),
	};

	const edf = data.readByte() as number;
	if (edf & 0x80) info.server_port = data.readShort() as number;
	if (edf & 0x10) info.steamid = data.readBigUInt64LE();
	if (edf & 0x40) {
		info.spec_port = data.readShort() as number;
		info.spec_name = data.readString();
	}
	if (edf & 0x20) info.keywords = data.readString();
	if (edf & 0x01) info.game_id_64 = data.readBigUInt64LE();

	return info;
}
