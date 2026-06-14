import "server-only";

import { z } from "zod";

import { assertAuthorOnSubmission } from "@/application/identity/resolve-submission-roles";
import {
  buildRevisionStorageKey,
  uploadManuscriptToStorage,
} from "@/infrastructure/submission/file-storage";
import {
  createRevisionFileRecord,
  loadSubmission,
} from "@/infrastructure/submission/submission-repository";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadRevisionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  file: z.instanceof(Buffer),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export type UploadRevisionResult = {
  fileId: string;
  round: number;
};

/**
 * Author uploads a revision manuscript for the pending round (`reviewRound + 1`).
 */
export async function uploadRevision(
  input: z.infer<typeof uploadRevisionSchema>,
): Promise<UploadRevisionResult> {
  const parsed = uploadRevisionSchema.parse(input);

  if (!ALLOWED_MIME_TYPES.has(parsed.mimeType)) {
    throw new Error("Unsupported revision file type.");
  }

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }
  if (submission.status !== "REVISIONS_REQUESTED") {
    throw new Error(
      "Revision upload is only allowed while revisions are requested.",
    );
  }

  await assertAuthorOnSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );

  const targetRound = submission.reviewRound + 1;
  const fileId = crypto.randomUUID();
  const storageKey = buildRevisionStorageKey({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    fileId,
    originalName: parsed.originalName,
    round: targetRound,
  });

  await uploadManuscriptToStorage({
    storageKey,
    file: parsed.file,
    mimeType: parsed.mimeType,
  });

  const record = await createRevisionFileRecord(parsed.journalId, {
    submissionId: parsed.submissionId,
    round: targetRound,
    storageKey,
    originalName: parsed.originalName,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
    uploadedById: parsed.actorUserId,
  });

  return {
    fileId: record.id,
    round: targetRound,
  };
}
