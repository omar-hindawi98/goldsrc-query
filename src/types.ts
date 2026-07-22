export interface ModInfo {
	mod: number;
	link: string | null;
	dl_link: string | null;
	version: number | null;
	size: number | null;
	type: number | null;
	dll: number | null;
}

export interface ServerInfo {
	address?: string;
	protocol: number;
	name: string;
	map: string;
	folder: string;
	game: string;
	game_id?: number;
	players: number;
	max_players: number;
	bots: number;
	server_type: string;
	env: string;
	visibility: number;
	vac: number;
	mod_info?: ModInfo;
	version?: string;
	server_port?: number;
	steamid?: bigint;
	spec_port?: number;
	spec_name?: string;
	keywords?: string;
	game_id_64?: bigint;
}

export interface PlayerInfo {
	index: number;
	name: string;
	score: number;
	duration: number;
}

export interface RulesInfo {
	total: number;
	list: Array<{ name: string; value: string }>;
}

export interface RconMessage {
	id: number;
	data: string;
}
