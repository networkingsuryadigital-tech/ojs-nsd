import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const hasAuth = Boolean(process.env.BETTER_AUTH_SECRET?.trim());

test.describe("editorial dashboard (demo tenant)", () => {
  test.skip(
    !hasDatabase || !hasAuth,
    "Membutuhkan DATABASE_URL dan BETTER_AUTH_SECRET di .env.",
  );

  test("journal admin dashboard returns 200 with statistics", async ({ page }) => {
    await loginAsDemoUser(page);
    const response = await page.goto("/editorial/dashboard");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Dashboard statistik" })).toBeVisible();
    await expect(page.getByText("Total submission")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }).getByRole("link", {
        name: "Dashboard",
      }),
    ).toBeVisible();
  });
});
