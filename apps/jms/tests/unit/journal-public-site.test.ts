import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fetchJournalPublicSite } from "@/infrastructure/journal/journal-public-repository";
import { adminDb } from "@/infrastructure/db/admin-db";
import { prisma } from "@/infrastructure/db/prisma";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("journal public site", () => {
  const runId = Date.now().toString(36);
  let journalId: string;

  beforeAll(async () => {
    const journal = await adminDb.journal.create({
      data: {
        name: `S3 Public Site ${runId}`,
        subdomain: `s3-public-${runId}`,
        publisher: "PT. NSD Test",
        issnOnline: "1234-5678",
        theme: {
          create: {
            primaryColor: "#0f766e",
            secondaryColor: "#134e4a",
            locale: "en",
          },
        },
        pages: {
          create: [
            {
              slug: "about",
              title: "About Test Journal",
              content: "# About\n\nTest content.",
            },
          ],
        },
      },
    });
    journalId = journal.id;
  });

  afterAll(async () => {
    await adminDb.journalPage.deleteMany({ where: { journalId } });
    await adminDb.journalTheme.deleteMany({ where: { journalId } });
    await adminDb.journal.delete({ where: { id: journalId } });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("loads theme and published pages via withTenant", async () => {
    const site = await fetchJournalPublicSite(journalId);

    expect(site).not.toBeNull();
    expect(site?.name).toBe(`S3 Public Site ${runId}`);
    expect(site?.theme.primaryColor).toBe("#0f766e");
    expect(site?.theme.locale).toBe("en");
    expect(site?.pages).toHaveLength(1);
    expect(site?.pages[0]?.slug).toBe("about");
    expect(site?.publisher).toBe("PT. NSD Test");
  });

  it("returns null for inactive journal", async () => {
    await adminDb.journal.update({
      where: { id: journalId },
      data: { isActive: false },
    });

    await expect(fetchJournalPublicSite(journalId)).resolves.toBeNull();

    await adminDb.journal.update({
      where: { id: journalId },
      data: { isActive: true },
    });
  });
});
