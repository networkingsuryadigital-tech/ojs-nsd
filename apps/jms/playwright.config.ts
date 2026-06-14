import { config } from "dotenv";
import path from "path";

import { defineConfig, devices } from "@playwright/test";

config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests/e2e",
  // Utang isolasi test: worker global = 1 — dev server + Supabase seed shared;
  // race 4-worker (platform health/cron burst) → 10/34. Refactor: DB fixture per
  // worker atau port terpisah per project.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "platform",
      testMatch: "**/home.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      },
    },
    {
      name: "demo-tenant",
      testMatch: [
        "**/editorial-happy-path.spec.ts",
        "**/editorial-dashboard.spec.ts",
        "**/oai-load.spec.ts",
        "**/auth-login.spec.ts",
        "**/author-portal.spec.ts",
      ],
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
        baseURL:
          process.env.PLAYWRIGHT_DEMO_BASE_URL ?? "http://demo.localhost:3000",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
});
