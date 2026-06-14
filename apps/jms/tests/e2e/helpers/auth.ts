import { expect, type Page } from "@playwright/test";

export const DEMO_ADMIN_EMAIL = "admin@demo.test";
export const DEMO_AUTHOR_EMAIL = "author@demo.test";
export const DEMO_PASSWORD = "Demo12345!";

export async function loginAsDemoUser(
  page: Page,
  email = DEMO_ADMIN_EMAIL,
  password = DEMO_PASSWORD,
): Promise<void> {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();

  await page.waitForURL(
    (url) => !url.pathname.endsWith("/login"),
    { timeout: 30_000 },
  );
}
