import "server-only";

import { z } from "zod";

import {
  createSimilarityCheckJob,
  findSimilarityCheckJob,
  loadLatestManuscriptFile,
  markSubmissionSimilarityPending,
} from "@/infrastructure/similarity/similarity-repository";

const enqueueSimilarityCheckSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
});

export type EnqueueSimilarityCheckResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: "no_manuscript" | "already_queued" };

export async function enqueueSimilarityCheck(
  input: z.infer<typeof enqueueSimilarityCheckSchema>,
): Promise<EnqueueSimilarityCheckResult> {
  const parsed = enqueueSimilarityCheckSchema.parse(input);

  const existing = await findSimilarityCheckJob(
    parsed.journalId,
    parsed.submissionId,
  );
  if (existing && existing.status !== "FAILED") {
    return { enqueued: false, reason: "already_queued" };
  }

  const manuscript = await loadLatestManuscriptFile(
    parsed.journalId,
    parsed.submissionId,
  );
  if (!manuscript) {
    return { enqueued: false, reason: "no_manuscript" };
  }

  await markSubmissionSimilarityPending(parsed.journalId, parsed.submissionId);
  const job = await createSimilarityCheckJob(
    parsed.journalId,
    parsed.submissionId,
    manuscript.fileId,
  );
  return { enqueued: true, jobId: job.id };
}
