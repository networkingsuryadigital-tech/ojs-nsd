import "server-only";

import { z } from "zod";

import type {
  UploadManuscriptInput,
  UploadManuscriptResult,
} from "@/domain/submission/types";
import { assertAuthorOnSubmission } from "@/application/identity/resolve-submission-roles";
import {
  buildManuscriptStorageKey,
  uploadManuscriptToStorage,
} from "@/infrastructure/submission/file-storage";
import {
  createManuscriptFileRecord,
  loadSubmission,
} from "@/infrastructure/submission/submission-repository";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadManuscriptSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  file: z.instanceof(Buffer),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export async function uploadManuscript(
  input: UploadManuscriptInput,
): Promise<UploadManuscriptResult> {
  const parsed = uploadManuscriptSchema.parse(input);

  if (!ALLOWED_MIME_TYPES.has(parsed.mimeType)) {
    throw new Error("Unsupported manuscript file type.");
  }

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }
  if (submission.status !== "DRAFT") {
    throw new Error("Manuscript upload is only allowed while submission is DRAFT.");
  }

  await assertAuthorOnSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );

  const fileId = crypto.randomUUID();
  const storageKey = buildManuscriptStorageKey({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    fileId,
    originalName: parsed.originalName,
    round: submission.reviewRound,
  });

  await uploadManuscriptToStorage({
    storageKey,
    file: parsed.file,
    mimeType: parsed.mimeType,
  });

  const record = await createManuscriptFileRecord(parsed.journalId, {
    submissionId: parsed.submissionId,
    storageKey,
    originalName: parsed.originalName,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
    uploadedById: parsed.actorUserId,
    round: submission.reviewRound,
  });

  return {
    fileId: record.id,
    storageKey: record.storageKey,
  };
}
