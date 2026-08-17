import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		projects: [
			{
				test: {
					name: "unit",
					globals: true,
					exclude: ["tests/**", "node_modules/**"],
				},
			},
			{
				test: {
					name: "e2e",
					globals: true,
					include: ["tests/**/*.test.ts"],
					testTimeout: 30000,
					hookTimeout: 360000,
					reporters: ["verbose"],
					pool: "forks",
				},
			},
		],
	},
});
