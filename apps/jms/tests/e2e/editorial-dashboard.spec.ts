import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

test.describe("editorial dashboard (demo tenant)", () => {
  test.skip(
    !hasDatabase || !hasSupabase,
    "Membutuhkan DATABASE_URL dan Supabase di .env.",
  );

  test("journal admin dashboard returns 200 with statistics", async ({ page }) => {
    await loginAsDemoUser(page);
    const response = await page.goto("/editorial/dashboard");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Dashboard statistik" })).toBeVisible();
    await expect(page.getByText("Total submission")).toBeVisible();
  });
});
