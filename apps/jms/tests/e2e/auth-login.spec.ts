import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const hasAuth = Boolean(process.env.BETTER_AUTH_SECRET?.trim());

test.describe("auth UI (demo tenant)", () => {
  test.skip(!hasAuth, "Membutuhkan BETTER_AUTH_SECRET di .env");

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
