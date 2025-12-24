import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.test.ts",
				"vitest.config.ts",
				"src/cli.ts",
				"src/index.ts",
				"src/services/index.ts",
				"src/types.ts",
				"src/oauth-flow.ts",
			],
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 80,
				statements: 90,
			},
		},
	},
});
