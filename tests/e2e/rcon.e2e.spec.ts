import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Query } from "../../src/index";

describe("goldsrc-query rcon e2e", () => {
	let query: Query;

	beforeEach(() => {
		query = new Query("127.0.0.1", 27015, 5000);
	});

	afterEach(() => {
		query.close();
	});

	it("connectRcon() authenticates successfully", async () => {
		await expect(query.connectRcon("e2e_test_password")).resolves.toBeUndefined();
	});

	it("connectRcon() rejects on wrong password", async () => {
		await expect(query.connectRcon("wrongpassword")).rejects.toThrow(
			"RCON authentication failed",
		);
	});

	it("sendRcon() rejects when called before connectRcon()", async () => {
		await expect(query.sendRcon("status")).rejects.toThrow(
			"RCON not connected",
		);
	});

	it("sendRcon() status contains known server identity", async () => {
		await query.connectRcon("e2e_test_password");
		const response = await query.sendRcon("status");
		expect(response.data).toContain("Counter-Strike 1.6 E2E Test Server");
		expect(response.data).toContain("de_dust2");
	});

	it("sendRcon() can execute multiple commands sequentially", async () => {
		await query.connectRcon("e2e_test_password");
		const r1 = await query.sendRcon("version");
		const r2 = await query.sendRcon("version");
		expect(r1.data.length).toBeGreaterThan(0);
		expect(r2.data.length).toBeGreaterThan(0);
	});
});
