import "server-only";

import { processSimilarityCheck } from "@/application/similarity/process-similarity-check";
import { listDueSimilarityCheckJobs } from "@/infrastructure/similarity/similarity-repository";

export type ProcessPendingSimilarityChecksResult = {
  scanned: number;
  completed: number;
  submitted: number;
  processing: number;
  retryScheduled: number;
  failed: number;
  skipped: number;
};

export async function processPendingSimilarityChecks(
  now: Date = new Date(),
): Promise<ProcessPendingSimilarityChecksResult> {
  const jobs = await listDueSimilarityCheckJobs(now);
  const result: ProcessPendingSimilarityChecksResult = {
    scanned: jobs.length,
    completed: 0,
    submitted: 0,
    processing: 0,
    retryScheduled: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    const outcome = await processSimilarityCheck(job, now);
    switch (outcome.outcome) {
      case "completed":
        result.completed += 1;
        break;
      case "submitted":
        result.submitted += 1;
        break;
      case "processing":
        result.processing += 1;
        break;
      case "retry_scheduled":
        result.retryScheduled += 1;
        break;
      case "failed":
        result.failed += 1;
        break;
      case "skipped":
        result.skipped += 1;
        break;
    }
  }

  return result;
}
