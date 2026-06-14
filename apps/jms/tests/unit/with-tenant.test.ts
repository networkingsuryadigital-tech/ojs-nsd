import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminDb } from "@/infrastructure/db/admin-db";
import { prisma } from "@/infrastructure/db/prisma";
import {
  getCurrentJournalId,
  withTenant,
} from "@/infrastructure/db/with-tenant";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("withTenant RLS", () => {
  const runId = Date.now().toString(36);
  let journalAId: string;
  let journalBId: string;
  let submissionAId: string;
  let submissionBId: string;

  beforeAll(async () => {
    const journalA = await adminDb.journal.create({
      data: {
        name: `S1 Test Journal A ${runId}`,
        subdomain: `s1-test-a-${runId}`,
      },
    });
    const journalB = await adminDb.journal.create({
      data: {
        name: `S1 Test Journal B ${runId}`,
        subdomain: `s1-test-b-${runId}`,
      },
    });
    journalAId = journalA.id;
    journalBId = journalB.id;

    const submissionA = await adminDb.submission.create({
      data: { journalId: journalAId },
    });
    const submissionB = await adminDb.submission.create({
      data: { journalId: journalBId },
    });
    submissionAId = submissionA.id;
    submissionBId = submissionB.id;

    await adminDb.submissionTranslation.createMany({
      data: [
        {
          submissionId: submissionAId,
          language: "id",
          title: "Judul A",
          abstract: "Abstrak A",
          keywords: ["test"],
          isPrimary: true,
        },
        {
          submissionId: submissionBId,
          language: "en",
          title: "Title B",
          abstract: "Abstract B",
          keywords: ["test"],
          isPrimary: true,
        },
      ],
    });
  });

  afterAll(async () => {
    await adminDb.submissionTranslation.deleteMany({
      where: {
        submissionId: { in: [submissionAId, submissionBId] },
      },
    });
    await adminDb.submission.deleteMany({
      where: { id: { in: [submissionAId, submissionBId] } },
    });
    await adminDb.journal.deleteMany({
      where: { id: { in: [journalAId, journalBId] } },
    });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("sets app.current_journal_id inside the transaction", async () => {
    await withTenant(journalAId, async (tx) => {
      const current = await getCurrentJournalId(tx);
      expect(current).toBe(journalAId);
    });
  });

  it("returns only submissions for the active tenant", async () => {
    const inA = await withTenant(journalAId, (tx) =>
      tx.submission.findMany({ select: { id: true } }),
    );
    expect(inA.map((s) => s.id)).toContain(submissionAId);
    expect(inA.map((s) => s.id)).not.toContain(submissionBId);

    const inB = await withTenant(journalBId, (tx) =>
      tx.submission.findMany({ select: { id: true } }),
    );
    expect(inB.map((s) => s.id)).toContain(submissionBId);
    expect(inB.map((s) => s.id)).not.toContain(submissionAId);
  });

  it("isolates SubmissionTranslation via submission parent RLS", async () => {
    const translationsA = await withTenant(journalAId, (tx) =>
      tx.submissionTranslation.findMany({ select: { submissionId: true } }),
    );
    expect(translationsA.every((t) => t.submissionId === submissionAId)).toBe(
      true,
    );
  });

  it("returns no tenant-scoped rows when journal id is not set", async () => {
    const submissions = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE jms_tenant`);
      await tx.$executeRaw`SET LOCAL row_security = on`;
      return tx.submission.findMany({ select: { id: true } });
    });
    expect(submissions).toHaveLength(0);
  });
});

describe("withTenant (unit)", () => {
  it("exports TENANT_SESSION_VAR constant", async () => {
    const { TENANT_SESSION_VAR } = await import(
      "@/infrastructure/db/with-tenant"
    );
    expect(TENANT_SESSION_VAR).toBe("app.current_journal_id");
  });
});
