"use server";

import {
  assignSubmissionToEditor,
  deskRejectSubmission,
  sendSubmissionToReview,
} from "@/application/review/perform-desk-review";
import { inviteReviewer } from "@/application/review/invite-reviewer";
import { recordEditorDecision } from "@/application/submission/record-editor-decision";
import {
  resubmitRevision,
  uploadAndResubmitRevision,
} from "@/application/submission/resubmit-revision";
import { uploadRevision } from "@/application/submission/upload-revision";
import { publishSubmissionToIssue } from "@/application/publishing/publish-submission-to-issue";
import { uploadGalley } from "@/application/publishing/upload-galley";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function assignToEditorAction(input: {
  submissionId: string;
  actorId: string;
  handlingEditorId?: string;
  note?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return assignSubmissionToEditor({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
    handlingEditorId: input.handlingEditorId,
    note: input.note,
  });
}

export async function deskRejectAction(input: {
  submissionId: string;
  actorId: string;
  note?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return deskRejectSubmission({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
    note: input.note,
  });
}

export async function sendToReviewAction(input: {
  submissionId: string;
  actorId: string;
  note?: string;
  acknowledgeHighSimilarity?: boolean;
}) {
  const journalId = await resolveRequestJournalId();

  return sendSubmissionToReview({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
    note: input.note,
    acknowledgeHighSimilarity: input.acknowledgeHighSimilarity,
  });
}

export async function inviteReviewerAction(input: {
  submissionId: string;
  actorId: string;
  reviewerId: string;
  dueAt?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return inviteReviewer({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
    reviewerId: input.reviewerId,
    dueAt: input.dueAt,
  });
}

export async function recordDecisionAction(input: {
  submissionId: string;
  actorId: string;
  decision: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
  note?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return recordEditorDecision({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
    decision: input.decision,
    note: input.note,
  });
}

export async function uploadRevisionAction(input: {
  submissionId: string;
  actorId: string;
  file: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const journalId = await resolveRequestJournalId();

  return uploadRevision({
    journalId,
    submissionId: input.submissionId,
    actorUserId: input.actorId,
    file: input.file,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
}

export async function resubmitRevisionAction(input: {
  submissionId: string;
  actorId: string;
}) {
  const journalId = await resolveRequestJournalId();

  return resubmitRevision({
    journalId,
    submissionId: input.submissionId,
    actorId: input.actorId,
  });
}

export async function assignToEditorFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  await assignToEditorAction({
    submissionId,
    actorId,
    note: "Assigned via desk review UI",
  });
}

export async function sendToReviewFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const acknowledgeHighSimilarity =
    formData.get("acknowledgeHighSimilarity") === "1";
  await sendToReviewAction({
    submissionId,
    actorId,
    acknowledgeHighSimilarity,
  });
}

export async function deskRejectFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  await deskRejectAction({
    submissionId,
    actorId,
    note: "Desk rejected via UI",
  });
}

export async function inviteReviewerFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const reviewerId = String(formData.get("reviewerId") ?? "");
  await inviteReviewerAction({ submissionId, actorId, reviewerId });
}

export async function recordDecisionFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const decision = String(formData.get("decision") ?? "") as
    | "ACCEPT"
    | "MINOR_REVISION"
    | "MAJOR_REVISION"
    | "REJECT";
  const note = String(formData.get("note") ?? "").trim() || undefined;
  await recordDecisionAction({ submissionId, actorId, decision, note });
}

export async function uploadAndResubmitFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const file = formData.get("revisionFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Revision file is required.");
  }

  const journalId = await resolveRequestJournalId();
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadAndResubmitRevision({
    journalId,
    submissionId,
    actorId,
    file: buffer,
    originalName: file.name,
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
  });
}

export async function resubmitRevisionFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  await resubmitRevisionAction({ submissionId, actorId });
}

export async function uploadGalleyAction(input: {
  submissionId: string;
  actorId: string;
  label: string;
  file: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const journalId = await resolveRequestJournalId();
  return uploadGalley({ journalId, ...input });
}

export async function publishSubmissionAction(input: {
  submissionId: string;
  actorId: string;
  issueId: string;
}) {
  const journalId = await resolveRequestJournalId();
  return publishSubmissionToIssue({ journalId, ...input });
}

export async function uploadGalleyFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const label = String(formData.get("label") ?? "PDF");
  const file = formData.get("galleyFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Galley file is required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadGalleyAction({
    submissionId,
    actorId,
    label,
    file: buffer,
    originalName: file.name,
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
  });
}

export async function publishSubmissionFormAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const actorId = await requireAuthenticatedUserId();
  const issueId = String(formData.get("issueId") ?? "");
  await publishSubmissionAction({ submissionId, actorId, issueId });
}
