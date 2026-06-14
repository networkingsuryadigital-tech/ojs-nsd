"use server";

import { redirect } from "next/navigation";

import { respondReviewInvitation } from "@/application/review/respond-review-invitation";
import { submitReview } from "@/application/review/submit-review";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function respondInvitationFormAction(formData: FormData) {
  const actorId = await requireAuthenticatedUserId();
  const journalId = await resolveRequestJournalId();
  const submissionId = String(formData.get("submissionId") ?? "");
  const response = String(formData.get("response") ?? "") as "ACCEPT" | "DECLINE";

  await respondReviewInvitation({
    journalId,
    submissionId,
    actorId,
    response,
  });

  redirect(`/reviewer/assignments/${submissionId}?responded=1`);
}

export async function submitReviewFormAction(formData: FormData) {
  const actorId = await requireAuthenticatedUserId();
  const journalId = await resolveRequestJournalId();
  const submissionId = String(formData.get("submissionId") ?? "");
  const recommendation = String(formData.get("recommendation") ?? "") as
    | "ACCEPT"
    | "MINOR_REVISION"
    | "MAJOR_REVISION"
    | "REJECT"
    | "SEE_COMMENTS";
  const commentsToAuthor =
    String(formData.get("commentsToAuthor") ?? "").trim() || undefined;
  const commentsToEditor =
    String(formData.get("commentsToEditor") ?? "").trim() || undefined;

  await submitReview({
    journalId,
    submissionId,
    actorId,
    recommendation,
    commentsToAuthor,
    commentsToEditor,
  });

  redirect(`/reviewer/assignments/${submissionId}?reviewed=1`);
}
