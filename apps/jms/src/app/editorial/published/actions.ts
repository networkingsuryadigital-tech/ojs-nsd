"use server";

import { redirect } from "next/navigation";

import { transitionSubmission } from "@/application/submission/transition-submission";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function retractPublicationFormAction(formData: FormData) {
  const journalId = await resolveRequestJournalId();
  const actorId = await requireAuthenticatedUserId();
  const submissionId = String(formData.get("submissionId") ?? "");
  const noticeReason = String(formData.get("noticeReason") ?? "");

  await transitionSubmission({
    journalId,
    submissionId,
    actorId,
    name: "retractPublication",
    payload: { noticeReason },
  });

  redirect("/editorial/published?saved=retraction");
}

export async function recordPublicationCorrectionFormAction(formData: FormData) {
  const journalId = await resolveRequestJournalId();
  const actorId = await requireAuthenticatedUserId();
  const submissionId = String(formData.get("submissionId") ?? "");
  const noticeType = String(formData.get("noticeType") ?? "CORRECTION");
  const noticeReason = String(formData.get("noticeReason") ?? "");

  await transitionSubmission({
    journalId,
    submissionId,
    actorId,
    name: "recordPublicationCorrection",
    payload: { noticeType, noticeReason },
  });

  redirect("/editorial/published?saved=correction");
}
