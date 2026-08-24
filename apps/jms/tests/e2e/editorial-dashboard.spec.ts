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
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }).getByRole("link", {
        name: "Platform",
      }),
    ).toHaveCount(0);
    await expect(
      page.locator("header").getByRole("link", { name: "Beranda" }),
    ).toHaveCount(0);
  });

  test("issues and published pages keep editorial sidebar", async ({ page }) => {
    await loginAsDemoUser(page);

    for (const path of ["/editorial/issues", "/editorial/published"] as const) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("navigation", { name: "Navigasi editorial" }),
      ).toBeVisible();
    }
  });

  test("dashboard KPI opens a filtered editorial queue", async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsDemoUser(page);
    await expect(page.getByRole("heading", { name: "Dashboard statistik" })).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole("link", { name: "Buka antrian naskah Sedang direview" })
      .click();
    await expect(page).toHaveURL(/\/editorial\/submissions\?status=UNDER_REVIEW/, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Antrian naskah" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }).getByRole("link", {
        name: "Naskah",
      }),
    ).toBeVisible();
  });

  test("mobile editorial layout exposes sidebar via menu button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsDemoUser(page);
    const response = await page.goto("/editorial/dashboard");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "Buka menu editorial" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Buka menu editorial" }).click();
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi editorial" }).getByRole("link", {
        name: "Terbitan",
      }),
    ).toBeVisible();
  });
});
