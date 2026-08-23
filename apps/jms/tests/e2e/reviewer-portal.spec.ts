import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const DEMO_REVIEWER_EMAIL = "reviewer1@demo.test";
const DEMO_PASSWORD = "Demo12345!";

const hasAuth = Boolean(process.env.BETTER_AUTH_SECRET?.trim());

test.describe("reviewer portal (demo tenant)", () => {
  test.skip(!hasAuth, "Membutuhkan BETTER_AUTH_SECRET di .env");

  test("unauthenticated reviewer portal redirects to login", async ({ page }) => {
    await page.goto("/reviewer/assignments");
    await expect(page).toHaveURL(/\/login/);
  });

  test("reviewer assignments page uses compact workspace chrome", async ({
    page,
  }) => {
    await loginAsDemoUser(page, DEMO_REVIEWER_EMAIL, DEMO_PASSWORD);
    const response = await page.goto("/reviewer/assignments");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Tugas review" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi reviewer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navigasi reviewer" }).getByRole("link", {
        name: "Platform",
      }),
    ).toHaveCount(0);
    await expect(
      page.locator("header").getByRole("link", { name: "Beranda" }),
    ).toHaveCount(0);
  });

  test("mobile reviewer layout exposes sidebar via menu button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsDemoUser(page, DEMO_REVIEWER_EMAIL, DEMO_PASSWORD);
    await page.goto("/reviewer/assignments");

    await expect(
      page.getByRole("button", { name: "Buka menu reviewer" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Buka menu reviewer" }).click();
    await expect(
      page.getByRole("navigation", { name: "Navigasi reviewer" }).getByRole("link", {
        name: "Tugas review",
      }),
    ).toBeVisible();
  });
});
