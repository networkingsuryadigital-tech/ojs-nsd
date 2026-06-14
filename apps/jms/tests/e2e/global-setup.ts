import { execSync } from "child_process";
import { config } from "dotenv";
import path from "path";

export default async function globalSetup(): Promise<void> {
  config({ path: path.resolve(__dirname, "../../.env") });

  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[e2e globalSetup] DATABASE_URL tidak diset — lewati fixture happy-path DB.",
    );
    return;
  }

  const cwd = path.resolve(__dirname, "..");
  execSync(
    "pnpm exec vitest run tests/e2e/fixtures/happy-path.harness.test.ts --config vitest.e2e-fixture.config.ts",
    { cwd, stdio: "inherit", env: process.env },
  );
}
