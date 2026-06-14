import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { ForbiddenTransitionError } from "@/domain/submission/errors";
import { adminDb } from "@/infrastructure/db/admin-db";
import { prisma } from "@/infrastructure/db/prisma";
import { withTenant } from "@/infrastructure/db/with-tenant";

const hasDatabase = Boolean(process.env.DATABASE_URL);

vi.mock("@/infrastructure/submission/file-storage", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/infrastructure/submission/file-storage")
  >();
  return {
    ...actual,
    uploadManuscriptToStorage: vi.fn().mockResolvedValue(undefined),
    createManuscriptSignedUrl: vi
      .fn()
      .mockResolvedValue("https://example.test/signed"),
  };
});

describe.skipIf(!hasDatabase)("submission use-cases", { timeout: 120_000 }, () => {
  const runId = Date.now().toString(36);
  let journalId: string;
  let sectionId: string;
  let authorUserId: string;
  let outsiderUserId: string;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    const author = await adminDb.user.create({
      data: {
        supabaseId: `s5-author-${runId}`,
        email: `s5-author-${runId}@example.com`,
        name: "S5 Author",
        affiliation: "Universitas Test",
      },
    });
    authorUserId = author.id;

    const outsider = await adminDb.user.create({
      data: {
        supabaseId: `s5-outsider-${runId}`,
        email: `s5-outsider-${runId}@example.com`,
        name: "S5 Outsider",
      },
    });
    outsiderUserId = outsider.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S5 Journal ${runId}`,
        subdomain: `s5-journal-${runId}`,
        oaiRepoName: `s5-journal-${runId}`,
      },
    });
    journalId = journal.id;

    const section = await adminDb.section.create({
      data: {
        journalId,
        title: "Artikel",
      },
    });
    sectionId = section.id;
  });

  afterAll(async () => {
    for (const submissionId of createdSubmissionIds) {
      await adminDb.editorialEvent.deleteMany({ where: { submissionId } });
      await adminDb.submissionFile.deleteMany({ where: { submissionId } });
      await adminDb.submissionTranslation.deleteMany({ where: { submissionId } });
      await adminDb.submissionParticipant.deleteMany({ where: { submissionId } });
      await adminDb.submissionAuthor.deleteMany({ where: { submissionId } });
      await adminDb.submission.delete({ where: { id: submissionId } });
    }
    await adminDb.section.deleteMany({ where: { journalId } });
    await adminDb.journal.delete({ where: { id: journalId } });
    await adminDb.user.deleteMany({
      where: { id: { in: [authorUserId, outsiderUserId] } },
    });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("creates DRAFT submission with authors, participants, and translation", async () => {
    const result = await createDraftSubmission({
      journalId,
      actorUserId: authorUserId,
      sectionId,
      authors: [
        {
          fullName: "S5 Author",
          email: `s5-author-${runId}@example.com`,
          affiliation: "Universitas Test",
          order: 1,
          isCorresponding: true,
        },
        {
          fullName: "Co Author",
          order: 2,
          isCorresponding: false,
        },
      ],
      translation: {
        language: "id",
        title: "Judul Naskah S5",
        abstract: "Abstrak naskah untuk pengujian sprint lima.",
        keywords: ["jms", "submission"],
      },
    });
    createdSubmissionIds.push(result.submissionId);

    const submission = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: result.submissionId },
        include: {
          authors: { orderBy: { order: "asc" } },
          participants: true,
          translations: true,
        },
      }),
    );

    expect(submission.status).toBe("DRAFT");
    expect(submission.journalId).toBe(journalId);
    expect(submission.sectionId).toBe(sectionId);
    expect(submission.authors).toHaveLength(2);
    expect(submission.translations).toHaveLength(1);
    expect(submission.translations[0]?.isPrimary).toBe(true);

    const roles = submission.participants
      .filter((participant) => participant.userId === authorUserId)
      .map((participant) => participant.role);
    expect(roles).toContain("AUTHOR");
    expect(roles).toContain("CORRESPONDING_AUTHOR");
  });

  it("uploads manuscript for author on DRAFT submission", async () => {
    const draft = await createDraftSubmission({
      journalId,
      actorUserId: authorUserId,
      authors: [
        {
          fullName: "S5 Author",
          email: `s5-author-${runId}@example.com`,
          order: 1,
          isCorresponding: true,
        },
      ],
      translation: {
        language: "id",
        title: "Upload Test",
        abstract: "Abstrak untuk uji unggah naskah.",
        keywords: ["upload"],
      },
    });
    createdSubmissionIds.push(draft.submissionId);

    const upload = await uploadManuscript({
      journalId,
      submissionId: draft.submissionId,
      actorUserId: authorUserId,
      file: Buffer.from("%PDF-1.4 test"),
      originalName: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 14,
    });

    expect(upload.storageKey).toContain(draft.submissionId);

    const file = await withTenant(journalId, (tx) =>
      tx.submissionFile.findFirstOrThrow({
        where: { id: upload.fileId },
      }),
    );
    expect(file.type).toBe("MANUSCRIPT");
    expect(file.round).toBe(0);
  });

  it("submits DRAFT to SUBMITTED and writes EditorialEvent", async () => {
    const draft = await createDraftSubmission({
      journalId,
      actorUserId: authorUserId,
      authors: [
        {
          fullName: "S5 Author",
          email: `s5-author-${runId}@example.com`,
          order: 1,
          isCorresponding: true,
        },
      ],
      translation: {
        language: "id",
        title: "Submit Test",
        abstract: "Abstrak untuk uji submit naskah.",
        keywords: ["submit"],
      },
    });
    createdSubmissionIds.push(draft.submissionId);

    await uploadManuscript({
      journalId,
      submissionId: draft.submissionId,
      actorUserId: authorUserId,
      file: Buffer.from("%PDF-1.4 submit"),
      originalName: "submit.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
    });

    const transition = await submitSubmission({
      journalId,
      submissionId: draft.submissionId,
      actorId: authorUserId,
    });
    expect(transition).toEqual({
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED",
      eventType: "STATUS_CHANGED",
    });

    const submission = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: draft.submissionId },
        include: { events: true },
      }),
    );
    expect(submission.status).toBe("SUBMITTED");
    expect(submission.submittedAt).not.toBeNull();
    expect(submission.events).toHaveLength(1);
    expect(submission.events[0]?.type).toBe("STATUS_CHANGED");
    expect(submission.events[0]?.fromStatus).toBe("DRAFT");
    expect(submission.events[0]?.toStatus).toBe("SUBMITTED");
  });

  it("rejects submit without manuscript", async () => {
    const draft = await createDraftSubmission({
      journalId,
      actorUserId: authorUserId,
      authors: [
        {
          fullName: "S5 Author",
          email: `s5-author-${runId}@example.com`,
          order: 1,
          isCorresponding: true,
        },
      ],
      translation: {
        language: "id",
        title: "No File",
        abstract: "Abstrak tanpa file naskah.",
        keywords: ["nofile"],
      },
    });
    createdSubmissionIds.push(draft.submissionId);

    await expect(
      submitSubmission({
        journalId,
        submissionId: draft.submissionId,
        actorId: authorUserId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenTransitionError);
  });

  it("rejects upload and submit for non-author user", async () => {
    const draft = await createDraftSubmission({
      journalId,
      actorUserId: authorUserId,
      authors: [
        {
          fullName: "S5 Author",
          email: `s5-author-${runId}@example.com`,
          order: 1,
          isCorresponding: true,
        },
      ],
      translation: {
        language: "id",
        title: "Auth Test",
        abstract: "Abstrak untuk uji otorisasi.",
        keywords: ["auth"],
      },
    });
    createdSubmissionIds.push(draft.submissionId);

    await expect(
      uploadManuscript({
        journalId,
        submissionId: draft.submissionId,
        actorUserId: outsiderUserId,
        file: Buffer.from("%PDF-1.4"),
        originalName: "blocked.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      }),
    ).rejects.toThrow(/authors/i);

    await expect(
      submitSubmission({
        journalId,
        submissionId: draft.submissionId,
        actorId: outsiderUserId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenTransitionError);
  });
});
