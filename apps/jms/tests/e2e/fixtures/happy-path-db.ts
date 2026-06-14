import { readFileSync, writeFileSync } from "fs";
import path from "path";

import { inviteReviewer } from "@/application/review/invite-reviewer";
import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { sendSubmissionToReview } from "@/application/review/perform-desk-review";
import { submitReview } from "@/application/review/submit-review";
import { recordEditorDecision } from "@/application/submission/record-editor-decision";
import { createIssue } from "@/application/publishing/create-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { withTenant } from "@/infrastructure/db/with-tenant";

import { runSeedDemo } from "../../../scripts/seed-demo";

import type { HappyPathFixture } from "./happy-path-fixture.types";
import { HAPPY_PATH_FIXTURE_PATH as FIXTURE_FILENAME } from "./happy-path-fixture.types";

const DEMO_PDF = Buffer.from("%PDF-1.4 JMS-E2E-HAPPY-PATH");

export type { HappyPathFixture } from "./happy-path-fixture.types";

export const HAPPY_PATH_FIXTURE_PATH = path.resolve(__dirname, "..", FIXTURE_FILENAME);

export function readHappyPathFixture(): HappyPathFixture {
  const raw = readFileSync(HAPPY_PATH_FIXTURE_PATH, "utf8");
  return JSON.parse(raw) as HappyPathFixture;
}

export function writeHappyPathFixture(fixture: HappyPathFixture): void {
  writeFileSync(HAPPY_PATH_FIXTURE_PATH, JSON.stringify(fixture, null, 2));
}

async function addEnglishTranslation(
  journalId: string,
  submissionId: string,
  titleEn: string,
  abstractEn: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submissionTranslation.upsert({
      where: {
        submissionId_language: { submissionId, language: "en" },
      },
      create: {
        submissionId,
        language: "en",
        title: titleEn,
        abstract: abstractEn,
        keywords: ["e2e", "happy-path"],
        isPrimary: false,
      },
      update: {
        title: titleEn,
        abstract: abstractEn,
      },
    }),
  );
}

export async function prepareHappyPathFixture(): Promise<HappyPathFixture> {
  const summary = await runSeedDemo({ releaseConnections: false });

  const authorId = summary.users.find((user) => user.email === "author@demo.test")!
    .userId;
  const editorId = summary.users.find((user) => user.email === "editor@demo.test")!
    .userId;
  const reviewerId = summary.users.find(
    (user) => user.email === "reviewer1@demo.test",
  )!.userId;
  const adminId = summary.users.find((user) => user.email === "admin@demo.test")!
    .userId;

  const runId = Date.now().toString(36);
  const uniqueTitle = `E2E Happy Path ${runId}`;

  const draft = await createDraftSubmission({
    journalId: summary.journal.id,
    actorUserId: authorId,
    sectionId: summary.sectionId,
    primaryLanguage: "id",
    authors: [
      {
        fullName: "Demo Author",
        email: "author@demo.test",
        affiliation: "Universitas Demo",
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title: uniqueTitle,
      abstract: "Naskah uji e2e happy-path editorial → OAI.",
      keywords: ["e2e", "happy-path", runId],
    },
  });

  await addEnglishTranslation(
    summary.journal.id,
    draft.submissionId,
    `E2E Happy Path ${runId}`,
    "End-to-end editorial workflow test manuscript.",
  );

  await uploadManuscript({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorUserId: authorId,
    file: DEMO_PDF,
    originalName: "e2e-happy-path.pdf",
    mimeType: "application/pdf",
    sizeBytes: DEMO_PDF.length,
  });

  await submitSubmission({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: authorId,
  });

  await transitionSubmission({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: editorId,
    name: "assignToEditor",
    payload: { handlingEditorId: editorId },
  });

  await withTenant(summary.journal.id, (tx) =>
    tx.submission.update({
      where: { id: draft.submissionId },
      data: {
        similarityStatus: "COMPLETED",
        similarityScore: 5,
      },
    }),
  );

  await sendSubmissionToReview({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: editorId,
    note: "E2E fixture — lolos desk review.",
    acknowledgeHighSimilarity: true,
  });

  await inviteReviewer({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: editorId,
    reviewerId,
    dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });

  await respondReviewInvitation({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: reviewerId,
    response: "ACCEPT",
  });

  await submitReview({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: reviewerId,
    recommendation: "ACCEPT",
    commentsToAuthor: "E2E review — acceptable for publication.",
    commentsToEditor: "Recommend accept.",
    scoreOriginality: 4,
    scoreClarity: 4,
    scoreContribution: 4,
  });

  await recordEditorDecision({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: editorId,
    decision: "ACCEPT",
    note: "E2E fixture accept.",
  });

  await transitionSubmission({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    isSystemActor: true,
    name: "paymentSettled",
  });

  await uploadGalley({
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    actorId: editorId,
    label: "PDF",
    file: DEMO_PDF,
    originalName: "e2e-happy-path-galley.pdf",
    mimeType: "application/pdf",
    sizeBytes: DEMO_PDF.length,
  });

  const e2eIssue = await createIssue({
    journalId: summary.journal.id,
    actorId: adminId,
    volume: 99,
    number: 1,
    year: 2026,
    title: "E2E Happy Path Terbitan",
  });

  return {
    journalId: summary.journal.id,
    submissionId: draft.submissionId,
    uniqueTitle,
    editorId,
    reviewerId,
    adminId,
    issueId: e2eIssue.issueId,
    tenantBaseUrl: summary.journal.previewUrl,
  };
}
