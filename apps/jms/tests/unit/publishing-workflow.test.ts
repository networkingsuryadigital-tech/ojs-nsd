import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createIssue } from "@/application/publishing/create-issue";
import { publishIssue } from "@/application/publishing/publish-issue";
import { publishSubmissionToIssue } from "@/application/publishing/publish-submission-to-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { adminDb } from "@/infrastructure/db/admin-db";
import { prisma } from "@/infrastructure/db/prisma";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { addSubmissionParticipant } from "@/infrastructure/submission/submission-repository";

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

vi.mock("@/infrastructure/submission/anonymization-pipeline", () => ({
  ensureAnonymizedManuscript: vi.fn().mockResolvedValue({
    fileId: "anon-file",
    storageKey: "journals/test/anonymized.pdf",
    created: true,
  }),
  createAnonymizedManuscriptSignedUrl: vi
    .fn()
    .mockResolvedValue("https://example.test/anonymized"),
}));

vi.mock("@/application/notification/emit-transition-notifications", () => ({
  emitTransitionNotifications: vi.fn().mockResolvedValue(undefined),
}));

async function seedInProductionSubmission(options: {
  journalId: string;
  authorUserId: string;
  handlingEditorUserId: string;
  sectionEditorUserId: string;
  sectionId: string;
  runId: string;
}) {
  const draft = await createDraftSubmission({
    journalId: options.journalId,
    actorUserId: options.authorUserId,
    sectionId: options.sectionId,
    authors: [
      {
        fullName: "S10 Author",
        email: `s10-author-${options.runId}@example.com`,
        affiliation: "Universitas S10",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: "Judul S10 Publish",
      abstract: "Abstrak untuk uji terbit.",
      keywords: ["publish"],
    },
  });

  await uploadManuscript({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorUserId: options.authorUserId,
    file: Buffer.from("%PDF-1.4 publish"),
    originalName: "manuscript.pdf",
    mimeType: "application/pdf",
    sizeBytes: 18,
  });

  await submitSubmission({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.authorUserId,
  });

  await transitionSubmission({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.sectionEditorUserId,
    name: "assignToEditor",
    payload: { handlingEditorId: options.handlingEditorUserId },
  });

  await transitionSubmission({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.handlingEditorUserId,
    name: "sendToReview",
  });

  await transitionSubmission({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.handlingEditorUserId,
    name: "recordDecision",
    payload: { decision: "ACCEPT" },
  });

  return draft.submissionId;
}

describe.skipIf(!hasDatabase)("publishing workflow", { timeout: 60_000 }, () => {
  const runId = Date.now().toString(36);
  let journalId: string;
  let sectionId: string;
  let authorUserId: string;
  let sectionEditorUserId: string;
  let handlingEditorUserId: string;
  let eicUserId: string;
  let issueId: string;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    const author = await adminDb.user.create({
      data: {
        supabaseId: `s10-author-${runId}`,
        email: `s10-author-${runId}@example.com`,
        name: "S10 Author",
      },
    });
    authorUserId = author.id;

    const sectionEditor = await adminDb.user.create({
      data: {
        supabaseId: `s10-section-${runId}`,
        email: `s10-section-${runId}@example.com`,
        name: "S10 Section Editor",
      },
    });
    sectionEditorUserId = sectionEditor.id;

    const handlingEditor = await adminDb.user.create({
      data: {
        supabaseId: `s10-handling-${runId}`,
        email: `s10-handling-${runId}@example.com`,
        name: "S10 Handling Editor",
      },
    });
    handlingEditorUserId = handlingEditor.id;

    const eic = await adminDb.user.create({
      data: {
        supabaseId: `s10-eic-${runId}`,
        email: `s10-eic-${runId}@example.com`,
        name: "S10 EIC",
      },
    });
    eicUserId = eic.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S10 Journal ${runId}`,
        subdomain: `s10-journal-${runId}`,
        oaiRepoName: `s10-journal-${runId}`,
        apcAmount: 0,
      },
    });
    journalId = journal.id;

    const section = await adminDb.section.create({
      data: { journalId, title: "Artikel" },
    });
    sectionId = section.id;

    await adminDb.journalMembership.createMany({
      data: [
        {
          journalId,
          userId: sectionEditorUserId,
          roles: ["SECTION_EDITOR"],
        },
        {
          journalId,
          userId: eicUserId,
          roles: ["EDITOR_IN_CHIEF"],
        },
      ],
    });
  });

  afterAll(async () => {
    for (const submissionId of createdSubmissionIds) {
      await adminDb.galley.deleteMany({ where: { submissionId } });
      await adminDb.editorialDecision.deleteMany({ where: { submissionId } });
      await adminDb.editorialEvent.deleteMany({ where: { submissionId } });
      await adminDb.apcInvoice.deleteMany({ where: { submissionId } });
      await adminDb.review.deleteMany({ where: { submissionId } });
      await adminDb.reviewAssignment.deleteMany({ where: { submissionId } });
      await adminDb.submissionFile.deleteMany({ where: { submissionId } });
      await adminDb.submissionTranslation.deleteMany({ where: { submissionId } });
      await adminDb.submissionParticipant.deleteMany({ where: { submissionId } });
      await adminDb.submissionAuthor.deleteMany({ where: { submissionId } });
      await adminDb.submission.delete({ where: { id: submissionId } });
    }
    if (issueId) {
      await adminDb.issue.delete({ where: { id: issueId } });
    }
    await adminDb.journalMembership.deleteMany({ where: { journalId } });
    await adminDb.section.deleteMany({ where: { journalId } });
    await adminDb.journal.delete({ where: { id: journalId } });
    await adminDb.user.deleteMany({
      where: {
        id: {
          in: [
            authorUserId,
            sectionEditorUserId,
            handlingEditorUserId,
            eicUserId,
          ],
        },
      },
    });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("creates issue and publishes submission with galley", async () => {
    const created = await createIssue({
      journalId,
      actorId: eicUserId,
      volume: 1,
      number: 1,
      year: 2026,
      title: "Terbitan Perdana",
    });
    issueId = created.issueId;

    const submissionId = await seedInProductionSubmission({
      journalId,
      authorUserId,
      handlingEditorUserId,
      sectionEditorUserId,
      sectionId,
      runId,
    });
    createdSubmissionIds.push(submissionId);

    await addSubmissionParticipant(journalId, {
      submissionId,
      userId: handlingEditorUserId,
      role: "HANDLING_EDITOR",
    });

    const inProduction = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({ where: { id: submissionId } }),
    );
    expect(inProduction.status).toBe("IN_PRODUCTION");

    await uploadGalley({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      label: "PDF",
      file: Buffer.from("%PDF-1.4 galley"),
      originalName: "article.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
    });

    const result = await publishSubmissionToIssue({
      journalId,
      submissionId,
      actorId: eicUserId,
      issueId,
    });
    expect(result.toStatus).toBe("PUBLISHED");

    const published = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { galleys: true, events: true },
      }),
    );
    expect(published.status).toBe("PUBLISHED");
    expect(published.issueId).toBe(issueId);
    expect(published.publishedAt).not.toBeNull();
    expect(published.galleys).toHaveLength(1);
    expect(
      published.events.some((event) => event.type === "PUBLISHED_TO_ISSUE"),
    ).toBe(true);

    const issuePublished = await publishIssue({
      journalId,
      actorId: eicUserId,
      issueId,
    });
    expect(issuePublished.isPublished).toBe(true);
  });
});
