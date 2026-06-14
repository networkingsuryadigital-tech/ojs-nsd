import "server-only";

import { processDoiDeposit } from "@/application/doi/process-doi-deposit";
import { listDueDoiDepositJobs } from "@/infrastructure/crossref/doi-repository";

export type ProcessPendingDoiDepositsResult = {
  scanned: number;
  registered: number;
  submitted: number;
  processing: number;
  retryScheduled: number;
  failed: number;
  skipped: number;
};

export async function processPendingDoiDeposits(
  now: Date = new Date(),
): Promise<ProcessPendingDoiDepositsResult> {
  const jobs = await listDueDoiDepositJobs(now);
  const result: ProcessPendingDoiDepositsResult = {
    scanned: jobs.length,
    registered: 0,
    submitted: 0,
    processing: 0,
    retryScheduled: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    const outcome = await processDoiDeposit(job, now);
    switch (outcome.outcome) {
      case "registered":
        result.registered += 1;
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
