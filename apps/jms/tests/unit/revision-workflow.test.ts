import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { inviteReviewer } from "@/application/review/invite-reviewer";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { sendSubmissionToReview } from "@/application/review/perform-desk-review";
import { recordEditorDecision } from "@/application/submission/record-editor-decision";
import {
  resubmitRevision,
  uploadAndResubmitRevision,
} from "@/application/submission/resubmit-revision";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
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

async function seedUnderReview(options: {
  journalId: string;
  authorUserId: string;
  sectionEditorUserId: string;
  handlingEditorUserId: string;
  sectionId: string;
  runId: string;
}) {
  const draft = await createDraftSubmission({
    journalId: options.journalId,
    actorUserId: options.authorUserId,
    sectionId: options.sectionId,
    authors: [
      {
        fullName: "S8 Author",
        email: `s8-author-${options.runId}@example.com`,
        affiliation: "Universitas S8",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: "Judul S8",
      abstract: "Abstrak siklus revisi.",
      keywords: ["revisi"],
    },
  });

  await uploadManuscript({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorUserId: options.authorUserId,
    file: Buffer.from("%PDF-1.4 revision-cycle"),
    originalName: "manuscript.pdf",
    mimeType: "application/pdf",
    sizeBytes: 22,
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

  await sendSubmissionToReview({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.handlingEditorUserId,
  });

  return draft.submissionId;
}

describe.skipIf(!hasDatabase)("revision round workflow", { timeout: 90_000 }, () => {
  const runId = Date.now().toString(36);
  let journalId: string;
  let sectionId: string;
  let authorUserId: string;
  let sectionEditorUserId: string;
  let handlingEditorUserId: string;
  let reviewerUserId: string;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    const author = await adminDb.user.create({
      data: {
        supabaseId: `s8-author-${runId}`,
        email: `s8-author-${runId}@example.com`,
        name: "S8 Author",
        affiliation: "Universitas S8",
      },
    });
    authorUserId = author.id;

    const sectionEditor = await adminDb.user.create({
      data: {
        supabaseId: `s8-editor-${runId}`,
        email: `s8-editor-${runId}@example.com`,
        name: "S8 Section Editor",
      },
    });
    sectionEditorUserId = sectionEditor.id;

    const handlingEditor = await adminDb.user.create({
      data: {
        supabaseId: `s8-handling-${runId}`,
        email: `s8-handling-${runId}@example.com`,
        name: "S8 Handling Editor",
      },
    });
    handlingEditorUserId = handlingEditor.id;

    const reviewer = await adminDb.user.create({
      data: {
        supabaseId: `s8-reviewer-${runId}`,
        email: `s8-reviewer-${runId}@example.com`,
        name: "S8 Reviewer",
      },
    });
    reviewerUserId = reviewer.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S8 Journal ${runId}`,
        subdomain: `s8-journal-${runId}`,
        oaiRepoName: `s8-journal-${runId}`,
        reviewModel: "DOUBLE_BLIND",
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
          userId: reviewerUserId,
          roles: ["REVIEWER"],
        },
      ],
    });
  });

  afterAll(async () => {
    for (const submissionId of createdSubmissionIds) {
      await adminDb.review.deleteMany({ where: { submissionId } });
      await adminDb.reviewAssignment.deleteMany({ where: { submissionId } });
      await adminDb.editorialDecision.deleteMany({ where: { submissionId } });
      await adminDb.editorialEvent.deleteMany({ where: { submissionId } });
      await adminDb.submissionFile.deleteMany({ where: { submissionId } });
      await adminDb.submissionTranslation.deleteMany({ where: { submissionId } });
      await adminDb.submissionParticipant.deleteMany({ where: { submissionId } });
      await adminDb.submissionAuthor.deleteMany({ where: { submissionId } });
      await adminDb.submission.delete({ where: { id: submissionId } });
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
            reviewerUserId,
          ],
        },
      },
    });
    await adminDb.$disconnect();
    await prisma.$disconnect();
  });

  it("runs full revision cycle: decision → upload → resubmit → re-review → accept", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId,
    });
    createdSubmissionIds.push(submissionId);

    await inviteReviewer({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      reviewerId: reviewerUserId,
    });

    await respondReviewInvitation({
      journalId,
      submissionId,
      actorId: reviewerUserId,
      response: "ACCEPT",
    });

    await submitReview({
      journalId,
      submissionId,
      actorId: reviewerUserId,
      recommendation: "MAJOR_REVISION",
      commentsToAuthor: "Perlu perbaikan metode.",
    });

    const decision = await recordEditorDecision({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      decision: "MAJOR_REVISION",
      note: "Ikuti saran reviewer.",
    });

    expect(decision.toStatus).toBe("REVISIONS_REQUESTED");

    const resubmit = await uploadAndResubmitRevision({
      journalId,
      submissionId,
      actorId: authorUserId,
      file: Buffer.from("%PDF-1.4 revised"),
      originalName: "revision-round-1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 18,
    });

    expect(resubmit.toStatus).toBe("RESUBMITTED");
    expect(resubmit.round).toBe(1);

    const sendAgain = await sendSubmissionToReview({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
    });
    expect(sendAgain.toStatus).toBe("UNDER_REVIEW");

    const accept = await recordEditorDecision({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      decision: "ACCEPT",
    });
    expect(accept.toStatus).toBe("ACCEPTED");

    const submission = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: {
          decisions: { orderBy: { createdAt: "asc" } },
          files: { where: { type: "REVISION" } },
        },
      }),
    );

    expect(submission.status).toBe("IN_PRODUCTION");
    expect(submission.reviewRound).toBe(1);
    expect(submission.decisions).toHaveLength(2);
    expect(submission.files).toHaveLength(1);
    expect(submission.files[0]?.round).toBe(1);
  });

  it("rejects submission after review via recordEditorDecision", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId: `${runId}-reject`,
    });
    createdSubmissionIds.push(submissionId);

    const result = await recordEditorDecision({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      decision: "REJECT",
      note: "Di luar scope jurnal.",
    });

    expect(result.toStatus).toBe("REJECTED");

    const decision = await withTenant(journalId, (tx) =>
      tx.editorialDecision.findFirst({ where: { submissionId } }),
    );
    expect(decision?.decision).toBe("REJECT");
  });

  it("requires revision file before resubmit", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId: `${runId}-nofile`,
    });
    createdSubmissionIds.push(submissionId);

    await recordEditorDecision({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      decision: "MINOR_REVISION",
    });

    await expect(
      resubmitRevision({
        journalId,
        submissionId,
        actorId: authorUserId,
      }),
    ).rejects.toThrow(/Revision file is required/);
  });
});
