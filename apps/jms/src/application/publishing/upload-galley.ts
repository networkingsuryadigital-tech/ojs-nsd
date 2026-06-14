import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { validateGalleyUpload } from "@/domain/publishing/galley";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { transitionSubmission } from "@/application/submission/transition-submission";
import {
  buildGalleyStorageKey,
  uploadManuscriptToStorage,
} from "@/infrastructure/submission/file-storage";
import { createGalleyRecord } from "@/infrastructure/publishing/galley-repository";
import { loadSubmission } from "@/infrastructure/submission/submission-repository";

const uploadGalleySchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  label: z.string().trim().min(1).max(20),
  file: z.instanceof(Buffer),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

async function assertGalleyUploader(
  journalId: string,
  submissionId: string,
  actorId: string,
): Promise<void> {
  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(journalId, submissionId, actorId),
    resolveJournalRoles(journalId, actorId),
  ]);

  const permitted =
    submissionRoles.includes("HANDLING_EDITOR") ||
    submissionRoles.includes("COPYEDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("JOURNAL_ADMIN");

  if (!permitted) {
    throw new SubmissionAuthorizationError(
      "Only copyeditors or handling editors may upload galleys.",
    );
  }
}

export async function uploadGalley(
  input: z.infer<typeof uploadGalleySchema>,
): Promise<{ galleyId: string; label: string }> {
  const parsed = uploadGalleySchema.parse(input);

  const validation = validateGalleyUpload(parsed.label, parsed.mimeType);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }
  if (submission.status !== "IN_PRODUCTION") {
    throw new Error("Galley upload is only allowed while in production.");
  }

  await assertGalleyUploader(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorId,
  );

  const fileId = crypto.randomUUID();
  const storageKey = buildGalleyStorageKey({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    fileId,
    originalName: parsed.originalName,
    label: validation.label,
  });

  await uploadManuscriptToStorage({
    storageKey,
    file: parsed.file,
    mimeType: parsed.mimeType,
  });

  const galley = await createGalleyRecord(parsed.journalId, {
    submissionId: parsed.submissionId,
    label: validation.label,
    storageKey,
    mimeType: parsed.mimeType,
  });

  await transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "uploadGalley",
    payload: {
      galleyId: galley.id,
      label: galley.label,
      originalName: parsed.originalName,
      sizeBytes: parsed.sizeBytes,
    },
  });

  return { galleyId: galley.id, label: galley.label };
}
