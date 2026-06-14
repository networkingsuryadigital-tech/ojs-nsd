import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

test.describe("auth UI (demo tenant)", () => {
  test.skip(!hasSupabase, "Membutuhkan kredensial Supabase di .env");

  test("unauthenticated editorial redirects to login", async ({ page }) => {
    await page.goto("/editorial/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
  });

  test("demo admin can login and open dashboard", async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto("/editorial/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard statistik" })).toBeVisible();
  });
});
