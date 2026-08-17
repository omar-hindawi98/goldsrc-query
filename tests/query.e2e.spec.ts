import { Query } from "../src/index";

describe("goldsrc-query udp e2e", () => {
  let query: Query | undefined;

  beforeAll(() => {
    query = new Query("127.0.0.1", 27015, 5000);
    query.connect();
  });

  afterAll(() => {
    query?.close();
  });

  it("ping() returns a non-negative number", async () => {
    if (!query) return;
    const ms = await query.ping();
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it("serverInfo() returns correct server identity", async () => {
    if (!query) return;
    const info = await query.serverInfo();
    expect(info.name).toBe("Counter-Strike 1.6 E2E Test Server");
    expect(info.map).toBe("de_dust2");
    expect(info.folder).toBe("cstrike");
    expect(info.game).toBe("Counter-Strike");
  });

  it("serverInfo() returns correct server configuration", async () => {
    if (!query) return;
    const info = await query.serverInfo();
    expect(info.max_players).toBe(16);
    expect(info.players).toBeGreaterThanOrEqual(0);
    expect(info.server_type).toBe("d");
    expect(info.env).toBe("l");
  });

  it("players() returns an array of valid player objects", async () => {
    if (!query) return;
    const players = await query.players();
    expect(Array.isArray(players)).toBe(true);
    for (const p of players) {
      expect(typeof p.index).toBe("number");
      expect(typeof p.name).toBe("string");
      expect(typeof p.score).toBe("number");
      expect(typeof p.duration).toBe("number");
      expect(p.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it("rules() returns a non-empty rule list with valid entries", async () => {
    if (!query) return;
    const rules = await query.rules();
    expect(rules.total).toBeGreaterThan(0);
    expect(rules.list.length).toBe(rules.total);
    for (const r of rules.list) {
      expect(typeof r.name).toBe("string");
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.value).toBe("string");
    }
  });

  it("rules() reflects server.cfg values", async () => {
    if (!query) return;
    const rules = await query.rules();
    const map = Object.fromEntries(rules.list.map((r) => [r.name, r.value]));
    expect(map.sv_gravity).toBe("800");
    expect(map.mp_friendlyfire).toBe("0");
    expect(map.sv_cheats).toBe("0");
    expect(map.mp_freezetime).toBe("3");
    expect(map.mp_roundtime).toBe("4");
    expect(map.sv_maxspeed).toBe("320");
  });
});
