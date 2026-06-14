import { existsSync, readFileSync } from "fs";
import path from "path";

import { expect, test } from "@playwright/test";

import { loginAsDemoUser } from "./helpers/auth";

import type { HappyPathFixture } from "./fixtures/happy-path-fixture.types";

const HAPPY_PATH_FIXTURE_PATH = path.resolve(__dirname, ".happy-path-fixture.json");

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const hasFixture = existsSync(HAPPY_PATH_FIXTURE_PATH);

function loadFixture(): HappyPathFixture {
  return JSON.parse(readFileSync(HAPPY_PATH_FIXTURE_PATH, "utf8")) as HappyPathFixture;
}

function editorialUrl(fixture: HappyPathFixture) {
  return `/editorial/submissions/${fixture.submissionId}`;
}

test.describe("editorial happy path (demo tenant)", () => {
  test.skip(
    !hasDatabase || !hasFixture,
    "Membutuhkan DATABASE_URL dan fixture dari globalSetup.",
  );

  test("submit → desk → review → accept → publish → OAI ListRecords", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const fixture = loadFixture();
    const { uniqueTitle } = fixture;

    await loginAsDemoUser(page);
    await page.goto(editorialUrl(fixture));
    await expect(page.getByText(uniqueTitle)).toBeVisible();
    await expect(page.getByText(/Status: IN_PRODUCTION/)).toBeVisible();
    await expect(page.getByText("PDF · application/pdf")).toBeVisible();

    if (fixture.issueId) {
      await page.locator('select[name="issueId"]').selectOption(fixture.issueId);
    }

    await page.getByRole("button", { name: "Publish to issue" }).click();

    await expect
      .poll(
        async () => {
          const audit = await page.request.get(
            `/api/editorial/submissions/${fixture.submissionId}/audit-trail`,
          );
          if (!audit.ok()) {
            return "";
          }
          const body = (await audit.json()) as { submissionStatus: string };
          return body.submissionStatus;
        },
        { timeout: 60_000 },
      )
      .toBe("PUBLISHED");

    await page.goto(editorialUrl(fixture));
    await expect(page.getByText(/Status: PUBLISHED/)).toBeVisible();

    const oaiResponse = await page.request.get(
      "/api/oai?verb=ListRecords&metadataPrefix=oai_dc",
    );
    expect(oaiResponse.ok()).toBeTruthy();
    const oaiXml = await oaiResponse.text();
    expect(oaiXml).toContain("<OAI-PMH");
    expect(oaiXml).toContain(uniqueTitle);
  });
});
