import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { inviteReviewer } from "@/application/review/invite-reviewer";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { buildSubmissionViewForViewer } from "@/application/review/build-submission-view";
import { sendSubmissionToReview } from "@/application/review/perform-desk-review";
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
        fullName: "S7 Author",
        email: `s7-author-${options.runId}@example.com`,
        affiliation: "Universitas S7",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: "Judul S7",
      abstract: "Abstrak peer review.",
      keywords: ["review"],
    },
  });

  await uploadManuscript({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorUserId: options.authorUserId,
    file: Buffer.from("%PDF-1.4 review"),
    originalName: "review.pdf",
    mimeType: "application/pdf",
    sizeBytes: 16,
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

describe.skipIf(!hasDatabase)("review workflow", { timeout: 90_000 }, () => {
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
        supabaseId: `s7-author-${runId}`,
        email: `s7-author-${runId}@example.com`,
        name: "S7 Author",
        affiliation: "Universitas S7",
      },
    });
    authorUserId = author.id;

    const sectionEditor = await adminDb.user.create({
      data: {
        supabaseId: `s7-editor-${runId}`,
        email: `s7-editor-${runId}@example.com`,
        name: "S7 Section Editor",
      },
    });
    sectionEditorUserId = sectionEditor.id;

    const handlingEditor = await adminDb.user.create({
      data: {
        supabaseId: `s7-handling-${runId}`,
        email: `s7-handling-${runId}@example.com`,
        name: "S7 Handling Editor",
      },
    });
    handlingEditorUserId = handlingEditor.id;

    const reviewer = await adminDb.user.create({
      data: {
        supabaseId: `s7-reviewer-${runId}`,
        email: `s7-reviewer-${runId}@example.com`,
        name: "S7 Reviewer",
        affiliation: "Universitas Lain",
      },
    });
    reviewerUserId = reviewer.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S7 Journal ${runId}`,
        subdomain: `s7-journal-${runId}`,
        oaiRepoName: `s7-journal-${runId}`,
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

  it("invites parallel reviewers with anonymous labels", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId,
    });
    createdSubmissionIds.push(submissionId);

    const invite = await inviteReviewer({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      reviewerId: reviewerUserId,
    });

    expect(invite.eventType).toBe("REVIEWER_INVITED");

    const assignments = await withTenant(journalId, (tx) =>
      tx.reviewAssignment.findMany({
        where: { submissionId },
        select: { anonymousLabel: true, reviewerId: true, status: true },
      }),
    );
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.anonymousLabel).toBe("Reviewer A");
    expect(assignments[0]?.status).toBe("INVITED");
  });

  it("accepts invitation and submits review", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId: `${runId}-submit`,
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

    const result = await submitReview({
      journalId,
      submissionId,
      actorId: reviewerUserId,
      recommendation: "MINOR_REVISION",
      commentsToAuthor: "Perjelas metode penelitian.",
      commentsToEditor: "Author responsive historically.",
    });

    expect(result.eventType).toBe("REVIEW_SUBMITTED");

    const review = await withTenant(journalId, (tx) =>
      tx.review.findFirst({
        where: { submissionId, reviewerId: reviewerUserId },
      }),
    );
    expect(review?.recommendation).toBe("MINOR_REVISION");
    expect(review?.commentsToEditor).toBe("Author responsive historically.");
  });

  it("does not leak author identity to double-blind reviewer view", async () => {
    const submissionId = await seedUnderReview({
      journalId,
      authorUserId,
      sectionEditorUserId,
      handlingEditorUserId,
      sectionId,
      runId: `${runId}-blind`,
    });
    createdSubmissionIds.push(submissionId);

    await withTenant(journalId, (tx) =>
      tx.submissionFile.create({
        data: {
          submissionId,
          type: "ANONYMIZED_MANUSCRIPT",
          round: 0,
          storageKey: `journals/${journalId}/submissions/${submissionId}/anonymized.pdf`,
          originalName: "anonymized-manuscript.pdf",
          mimeType: "application/pdf",
          sizeBytes: 16,
          isAnonymized: true,
        },
      }),
    );

    const reviewerView = await buildSubmissionViewForViewer(
      journalId,
      submissionId,
      "DOUBLE_BLIND",
      {
        reviewModel: "DOUBLE_BLIND",
        submissionRoles: ["REVIEWER"],
        journalRoles: [],
      },
    );

    expect(reviewerView?.authors).toBeNull();
    expect(reviewerView?.title).toBe("Judul S7");
  });
});
