import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "unit",
					exclude: ["tests/e2e/**", "node_modules/**"],
				},
			},
			{
				test: {
					name: "e2e",
					include: ["tests/e2e/**/*.e2e.spec.ts"],
					testTimeout: 30000,
					hookTimeout: 360000,
					reporters: ["verbose"],
					pool: "forks",
				},
			},
		],
	},
});
