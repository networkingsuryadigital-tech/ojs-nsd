"use server";

import { redirect } from "next/navigation";

import { createDraftSubmission } from "@/application/submission/create-draft-submission";
import { submitSubmission } from "@/application/submission/submit-submission";
import { uploadManuscript } from "@/application/submission/upload-manuscript";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function createDraftFormAction(formData: FormData) {
  const actorUserId = await requireAuthenticatedUserId();
  const journalId = await resolveRequestJournalId();

  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "").trim() || undefined;
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || undefined;
  const affiliation = String(formData.get("affiliation") ?? "").trim() || undefined;

  const keywords = keywordsRaw
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const result = await createDraftSubmission({
    journalId,
    actorUserId,
    sectionId,
    primaryLanguage: "id",
    authors: [
      {
        fullName,
        email,
        affiliation,
        order: 1,
        isCorresponding: true,
      },
    ],
    translation: {
      language: "id",
      title,
      abstract,
      keywords: keywords.length > 0 ? keywords : ["belum diisi"],
    },
  });

  redirect(`/author/submissions/${result.submissionId}`);
}

export async function uploadManuscriptFormAction(formData: FormData) {
  const actorUserId = await requireAuthenticatedUserId();
  const journalId = await resolveRequestJournalId();
  const submissionId = String(formData.get("submissionId") ?? "");
  const file = formData.get("manuscriptFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Manuscript file is required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadManuscript({
    journalId,
    submissionId,
    actorUserId,
    file: buffer,
    originalName: file.name,
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
  });

  redirect(`/author/submissions/${submissionId}?uploaded=1`);
}

export async function submitManuscriptFormAction(formData: FormData) {
  const actorUserId = await requireAuthenticatedUserId();
  const journalId = await resolveRequestJournalId();
  const submissionId = String(formData.get("submissionId") ?? "");

  await submitSubmission({
    journalId,
    submissionId,
    actorId: actorUserId,
  });

  redirect(`/author/submissions/${submissionId}?submitted=1`);
}
