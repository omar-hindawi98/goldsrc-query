import type { BufferExt } from "../lib/BufferExt";
import type { PlayerInfo } from "../types";

export function parsePlayers(data: BufferExt): PlayerInfo[] {
	const total = data.readByte() as number;
	const players: PlayerInfo[] = [];

	for (let i = 0; i < total; i++) {
		players.push({
			index: data.readByte() as number,
			name: data.readString(),
			score: data.readLong() as number,
			duration: data.readFloat() as number,
		});
	}

	return players;
}
