import "server-only";

import { z } from "zod";

import { assertAuthorOnSubmission } from "@/application/identity/resolve-submission-roles";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { uploadRevision } from "@/application/submission/upload-revision";

const resubmitRevisionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

/**
 * Author resubmits after uploading a revision file for the pending round.
 */
export async function resubmitRevision(
  input: z.infer<typeof resubmitRevisionSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = resubmitRevisionSchema.parse(input);
  await assertAuthorOnSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorId,
  );

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "authorResubmit",
  });
}

const uploadAndResubmitRevisionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  file: z.instanceof(Buffer),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

/**
 * Upload revision file then transition to RESUBMITTED in one step (UI convenience).
 */
export async function uploadAndResubmitRevision(
  input: z.infer<typeof uploadAndResubmitRevisionSchema>,
): Promise<{
  fileId: string;
  round: number;
  fromStatus: string;
  toStatus: string;
  eventType: string;
}> {
  const parsed = uploadAndResubmitRevisionSchema.parse(input);

  const upload = await uploadRevision({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorUserId: parsed.actorId,
    file: parsed.file,
    originalName: parsed.originalName,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  });

  const transition = await resubmitRevision({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
  });

  return { ...upload, ...transition };
}
