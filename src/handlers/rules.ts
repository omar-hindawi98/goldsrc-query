import type { BufferExt } from "../lib/BufferExt";
import type { RulesInfo } from "../types";

export function parseRules(data: BufferExt): RulesInfo {
	const total = data.readShort() as number;
	const list: RulesInfo["list"] = [];

	for (let i = 0; i < total; i++) {
		list.push({ name: data.readString(), value: data.readString() });
	}

	return { total, list };
}
