import path from "path";
import { defineConfig } from "vitest/config";

/** Vitest config for `pnpm db:seed:demo` — mirrors unit-test aliases & I/O mocks. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.harness.test.ts"],
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
