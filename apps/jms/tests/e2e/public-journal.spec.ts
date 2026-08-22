import { expect, test } from "@playwright/test";

test.describe("public journal (demo tenant)", () => {
  test("tenant homepage shows journal identity", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: "Beranda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Arsip" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cari" })).toBeVisible();
  });

  test("archives page renders", async ({ page }) => {
    const response = await page.goto("/issues");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /Arsip Terbitan/i }),
    ).toBeVisible();
  });

  test("current issue page renders or redirects to an issue", async ({ page }) => {
    const response = await page.goto("/current");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/(current|issues\/)/);
  });

  test("search page renders", async ({ page }) => {
    const response = await page.goto("/search");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Cari" })).toBeVisible();
    await page.goto("/search?q=demo");
    await expect(page.locator("form")).toBeVisible();
  });

  test("editorial board page renders without emails", async ({ page }) => {
    const response = await page.goto("/editorial-board");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Dewan Editor" }),
    ).toBeVisible();
    await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  });

  test("register author page renders", async ({ page }) => {
    const response = await page.goto("/login/register");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Daftar sebagai penulis")).toBeVisible();
  });
});
