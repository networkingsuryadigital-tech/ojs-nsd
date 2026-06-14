import path from "path";
import { defineConfig } from "vitest/config";

/** Vitest config for Playwright e2e DB fixtures — mirrors seed harness aliases. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/fixtures/**/*.harness.test.ts"],
    setupFiles: ["scripts/seed-setup-env.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
