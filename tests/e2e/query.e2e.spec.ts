import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Query } from '../../src/index';

const HOST = process.env.E2E_HOST ?? '127.0.0.1';
const PORT = Number(process.env.E2E_PORT ?? 27015);
const RCON_PASSWORD = process.env.E2E_RCON_PASSWORD ?? 'e2e_test_password';

async function waitForServer(host: string, port: number, retries = 20, interval = 3000): Promise<void> {
    for (let i = 0; i < retries; i++) {
        const q = new Query(host, port, 2000);
        try {
            q.connect();
            await q.serverInfo();
            return;
        } catch {
            // not ready yet
        } finally {
            q.close();
        }
        await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Server at ${host}:${port} did not become ready after ${retries} attempts`);
}

describe('goldsrc-query e2e', () => {
    let query: Query;

    beforeAll(async () => {
        await waitForServer(HOST, PORT);
        query = new Query(HOST, PORT, 5000);
        query.connect();
    });

    afterAll(() => {
        query.close();
    });

    it('ping() returns a positive number', async () => {
        const ms = await query.ping();
        expect(ms).toBeGreaterThanOrEqual(0);
    });

    it('serverInfo() returns expected shape', async () => {
        const info = await query.serverInfo();
        expect(info.name).toBeDefined();
        expect(typeof info.map).toBe('string');
        expect(info.max_players).toBeGreaterThan(0);
        expect(info.players).toBeGreaterThanOrEqual(0);
        expect(['d', 'l', 'p']).toContain(info.server_type);
        expect(['l', 'w', 'm']).toContain(info.env);
    });

    it('serverInfo() map is de_dust2', async () => {
        const info = await query.serverInfo();
        expect(info.map).toBe('de_dust2');
    });

    it('players() returns an array', async () => {
        const players = await query.players();
        expect(Array.isArray(players)).toBe(true);
    });

    it('rules() returns a non-empty rule list', async () => {
        const rules = await query.rules();
        expect(rules.total).toBeGreaterThan(0);
        expect(rules.list.length).toBe(rules.total);
        rules.list.forEach((r) => {
            expect(typeof r.name).toBe('string');
            expect(typeof r.value).toBe('string');
        });
    });

    it('connectRcon() authenticates successfully', async () => {
        const rconQuery = new Query(HOST, PORT, 5000);
        await expect(rconQuery.connectRcon(RCON_PASSWORD)).resolves.toBeUndefined();
        rconQuery.close();
    });

    it('connectRcon() rejects on wrong password', async () => {
        const rconQuery = new Query(HOST, PORT, 5000);
        await expect(rconQuery.connectRcon('wrongpassword')).rejects.toThrow(
            'RCON authentication failed',
        );
        rconQuery.close();
    });

    it('sendRcon() returns a response for status command', async () => {
        const rconQuery = new Query(HOST, PORT, 5000);
        await rconQuery.connectRcon(RCON_PASSWORD);
        const response = await rconQuery.sendRcon('status');
        expect(typeof response.data).toBe('string');
        expect(response.data.length).toBeGreaterThan(0);
        rconQuery.close();
    });
});
