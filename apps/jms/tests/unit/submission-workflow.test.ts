import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

async function seedSubmittedSubmission(options: {
  journalId: string;
  authorUserId: string;
  sectionId: string;
  runId: string;
}) {
  const draft = await createDraftSubmission({
    journalId: options.journalId,
    actorUserId: options.authorUserId,
    sectionId: options.sectionId,
    authors: [
      {
        fullName: "S6 Author",
        email: `s6-author-${options.runId}@example.com`,
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: "Judul S6",
      abstract: "Abstrak untuk uji workflow editorial.",
      keywords: ["workflow"],
    },
  });

  await uploadManuscript({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorUserId: options.authorUserId,
    file: Buffer.from("%PDF-1.4 workflow"),
    originalName: "workflow.pdf",
    mimeType: "application/pdf",
    sizeBytes: 18,
  });

  await submitSubmission({
    journalId: options.journalId,
    submissionId: draft.submissionId,
    actorId: options.authorUserId,
  });

  return draft.submissionId;
}

describe.skipIf(!hasDatabase)("submission editorial workflow", { timeout: 60_000 }, () => {
  const runId = Date.now().toString(36);
  let journalId: string;
  let sectionId: string;
  let authorUserId: string;
  let sectionEditorUserId: string;
  let handlingEditorUserId: string;
  let reviewerUserId: string;
  let issueId: string;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    const author = await adminDb.user.create({
      data: {
        supabaseId: `s6-author-${runId}`,
        email: `s6-author-${runId}@example.com`,
        name: "S6 Author",
      },
    });
    authorUserId = author.id;

    const sectionEditor = await adminDb.user.create({
      data: {
        supabaseId: `s6-editor-${runId}`,
        email: `s6-editor-${runId}@example.com`,
        name: "S6 Section Editor",
      },
    });
    sectionEditorUserId = sectionEditor.id;

    const handlingEditor = await adminDb.user.create({
      data: {
        supabaseId: `s6-handling-${runId}`,
        email: `s6-handling-${runId}@example.com`,
        name: "S6 Handling Editor",
      },
    });
    handlingEditorUserId = handlingEditor.id;

    const reviewer = await adminDb.user.create({
      data: {
        supabaseId: `s6-reviewer-${runId}`,
        email: `s6-reviewer-${runId}@example.com`,
        name: "S6 Reviewer",
      },
    });
    reviewerUserId = reviewer.id;

    const journal = await adminDb.journal.create({
      data: {
        name: `S6 Journal ${runId}`,
        subdomain: `s6-journal-${runId}`,
        oaiRepoName: `s6-journal-${runId}`,
        apcAmount: 250_000,
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

    const issue = await adminDb.issue.create({
      data: {
        journalId,
        volume: 1,
        number: 1,
        year: 2026,
      },
    });
    issueId = issue.id;
  });

  afterAll(async () => {
    for (const submissionId of createdSubmissionIds) {
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
    await adminDb.issue.delete({ where: { id: issueId } });
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

  it("runs desk review → peer review → minor revision → resubmit", async () => {
    const submissionId = await seedSubmittedSubmission({
      journalId,
      authorUserId,
      sectionId,
      runId,
    });
    createdSubmissionIds.push(submissionId);

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: sectionEditorUserId,
      name: "assignToEditor",
      payload: { handlingEditorId: handlingEditorUserId },
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "sendToReview",
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "recordDecision",
      payload: { decision: "MINOR_REVISION", note: "Perbaiki abstrak." },
    });

    await withTenant(journalId, (tx) =>
      tx.submissionFile.create({
        data: {
          submissionId,
          type: "REVISION",
          round: 1,
          storageKey: `journals/${journalId}/submissions/${submissionId}/round-1/revision/rev.pdf`,
          originalName: "revision.pdf",
          mimeType: "application/pdf",
          sizeBytes: 20,
          uploadedById: authorUserId,
        },
      }),
    );

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: authorUserId,
      name: "authorResubmit",
    });

    const submission = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { events: { orderBy: { createdAt: "asc" } }, decisions: true },
      }),
    );

    expect(submission.status).toBe("RESUBMITTED");
    expect(submission.reviewRound).toBe(1);
    expect(submission.events.length).toBeGreaterThanOrEqual(5);
    expect(submission.events.map((event) => event.type)).toContain(
      "DECISION_MADE",
    );
    expect(submission.decisions).toHaveLength(1);
    expect(submission.decisions[0]?.decision).toBe("MINOR_REVISION");
  });

  it("accepts submission and creates APC invoice", async () => {
    const submissionId = await seedSubmittedSubmission({
      journalId,
      authorUserId,
      sectionId,
      runId: `${runId}-apc`,
    });
    createdSubmissionIds.push(submissionId);

    await addSubmissionParticipant(journalId, {
      submissionId,
      userId: handlingEditorUserId,
      role: "HANDLING_EDITOR",
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: sectionEditorUserId,
      name: "assignToEditor",
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "sendToReview",
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "recordDecision",
      payload: { decision: "ACCEPT" },
    });

    const withInvoice = await withTenant(journalId, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { invoice: true, events: true },
      }),
    );
    expect(withInvoice.status).toBe("PAYMENT_PENDING");
    expect(withInvoice.acceptedAt).not.toBeNull();
    expect(withInvoice.invoice?.status).toBe("ISSUED");
    expect(withInvoice.invoice?.amount).toBe(250_000);
    expect(
      withInvoice.events.some((event) => event.type === "APC_INVOICE_CREATED"),
    ).toBe(true);
  });

  it("skips payment when journal apc is zero", async () => {
    const zeroApcJournal = await adminDb.journal.create({
      data: {
        name: `S6 Zero APC ${runId}`,
        subdomain: `s6-zero-${runId}`,
        oaiRepoName: `s6-zero-${runId}`,
        apcAmount: 0,
      },
    });
    const zeroSection = await adminDb.section.create({
      data: { journalId: zeroApcJournal.id, title: "Artikel" },
    });

    const submissionId = await seedSubmittedSubmission({
      journalId: zeroApcJournal.id,
      authorUserId,
      sectionId: zeroSection.id,
      runId: `${runId}-zero`,
    });

    await adminDb.journalMembership.create({
      data: {
        journalId: zeroApcJournal.id,
        userId: sectionEditorUserId,
        roles: ["SECTION_EDITOR"],
      },
    });

    await transitionSubmission({
      journalId: zeroApcJournal.id,
      submissionId,
      actorId: sectionEditorUserId,
      name: "assignToEditor",
      payload: { handlingEditorId: handlingEditorUserId },
    });

    await transitionSubmission({
      journalId: zeroApcJournal.id,
      submissionId,
      actorId: handlingEditorUserId,
      name: "sendToReview",
    });

    await transitionSubmission({
      journalId: zeroApcJournal.id,
      submissionId,
      actorId: handlingEditorUserId,
      name: "recordDecision",
      payload: { decision: "ACCEPT" },
    });

    const submission = await withTenant(zeroApcJournal.id, (tx) =>
      tx.submission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { invoice: true },
      }),
    );
    expect(submission.status).toBe("IN_PRODUCTION");
    expect(submission.invoice).toBeNull();

    await adminDb.editorialEvent.deleteMany({ where: { submissionId } });
    await adminDb.editorialDecision.deleteMany({ where: { submissionId } });
    await adminDb.submissionFile.deleteMany({ where: { submissionId } });
    await adminDb.submissionTranslation.deleteMany({ where: { submissionId } });
    await adminDb.submissionParticipant.deleteMany({ where: { submissionId } });
    await adminDb.submissionAuthor.deleteMany({ where: { submissionId } });
    await adminDb.submission.delete({ where: { id: submissionId } });
    await adminDb.journalMembership.deleteMany({
      where: { journalId: zeroApcJournal.id },
    });
    await adminDb.section.delete({ where: { id: zeroSection.id } });
    await adminDb.journal.delete({ where: { id: zeroApcJournal.id } });
  });

  it("records non-status inviteReviewer event", async () => {
    const submissionId = await seedSubmittedSubmission({
      journalId,
      authorUserId,
      sectionId,
      runId: `${runId}-invite`,
    });
    createdSubmissionIds.push(submissionId);

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: sectionEditorUserId,
      name: "assignToEditor",
      payload: { handlingEditorId: handlingEditorUserId },
    });

    await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "sendToReview",
    });

    const result = await transitionSubmission({
      journalId,
      submissionId,
      actorId: handlingEditorUserId,
      name: "inviteReviewer",
      payload: { reviewerId: reviewerUserId },
    });

    expect(result.toStatus).toBe("UNDER_REVIEW");
    expect(result.eventType).toBe("REVIEWER_INVITED");

    const [events, assignment] = await Promise.all([
      withTenant(journalId, (tx) =>
        tx.editorialEvent.findMany({
          where: { submissionId, type: "REVIEWER_INVITED" },
        }),
      ),
      withTenant(journalId, (tx) =>
        tx.reviewAssignment.findFirst({
          where: { submissionId, reviewerId: reviewerUserId },
        }),
      ),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]?.fromStatus).toBe("UNDER_REVIEW");
    expect(events[0]?.toStatus).toBe("UNDER_REVIEW");
    expect(assignment?.anonymousLabel).toBe("Reviewer A");
  });
});
