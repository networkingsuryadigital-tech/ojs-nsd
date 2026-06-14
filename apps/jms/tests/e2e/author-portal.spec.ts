import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

const DEMO_AUTHOR_EMAIL = "author@demo.test";
const DEMO_PASSWORD = "Demo12345!";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

test.describe("author portal (demo tenant)", () => {
  test.skip(!hasSupabase, "Membutuhkan kredensial Supabase di .env");

  test("unauthenticated author portal redirects to login", async ({ page }) => {
    await page.goto("/author/submissions");
    await expect(page).toHaveURL(/\/login/);
  });

  test("author can list submissions and open draft detail", async ({ page }) => {
    await loginAsDemoUser(page, DEMO_AUTHOR_EMAIL, DEMO_PASSWORD);
    await expect(page).toHaveURL(/\/author\/submissions/);

    await expect(page.getByRole("heading", { name: "Naskah saya" })).toBeVisible();
    const draftLink = page
      .getByRole("link", { name: "Demo A: Naskah Draft" })
      .first();
    await expect(draftLink).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/author\/submissions\/[^/]+$/),
      draftLink.click(),
    ]);

    await expect(
      page.getByRole("heading", { name: "Demo A: Naskah Draft" }),
    ).toBeVisible();
    await expect(page.getByText("Status: Draft")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim naskah" })).toBeVisible();
  });

  test("author can open new submission form", async ({ page }) => {
    await loginAsDemoUser(page, DEMO_AUTHOR_EMAIL, DEMO_PASSWORD);
    await page.goto("/author/submissions");
    await page.getByRole("link", { name: "Naskah baru" }).click();
    await expect(page.getByRole("heading", { name: "Naskah baru" })).toBeVisible();
    await expect(page.getByLabel("Judul")).toBeVisible();
    await expect(page.getByRole("button", { name: "Simpan draft" })).toBeVisible();
  });
});
