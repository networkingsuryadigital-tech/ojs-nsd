import "server-only";

import {
  computeSimilarityNextRetryAt,
  shouldRetrySimilarityCheck,
} from "@/domain/similarity/retry";
import type { SimilarityProviderName } from "@/domain/similarity/types";
import { resolveSimilarityProviderByName } from "@/infrastructure/similarity/resolve-provider";
import { resolveSimilarityProviderForJournal } from "@/infrastructure/similarity/resolve-provider";
import { buildSimilarityReportUrl } from "@/infrastructure/similarity/report-url";
import {
  completeSimilarityCheck,
  failSimilarityCheck,
  loadLatestManuscriptFile,
  updateSimilarityCheckJob,
  type SimilarityCheckJobRecord,
} from "@/infrastructure/similarity/similarity-repository";
import { downloadManuscriptBytes } from "@/infrastructure/submission/file-storage";

export type ProcessSimilarityCheckResult =
  | { outcome: "completed"; score: number }
  | { outcome: "submitted"; externalScanId: string }
  | { outcome: "processing" }
  | { outcome: "retry_scheduled"; attemptCount: number; nextRetryAt: Date }
  | { outcome: "failed"; error: string }
  | { outcome: "skipped"; reason: string };

async function failJob(
  job: SimilarityCheckJobRecord,
  error: string,
  attemptCount: number,
  now: Date,
): Promise<ProcessSimilarityCheckResult> {
  const nextRetryAt = computeSimilarityNextRetryAt(attemptCount, now);
  if (nextRetryAt && shouldRetrySimilarityCheck(attemptCount)) {
    await updateSimilarityCheckJob(job.journalId, job.id, {
      attemptCount,
      nextRetryAt,
      lastError: error,
    });
    return { outcome: "retry_scheduled", attemptCount, nextRetryAt };
  }

  await failSimilarityCheck(job.journalId, job.submissionId, job.id, error);
  return { outcome: "failed", error };
}

function buildScanId(job: SimilarityCheckJobRecord): string {
  return `jms-${job.journalId}-${job.submissionId}`.slice(0, 120);
}

function resolveJobProvider(
  job: SimilarityCheckJobRecord,
  fallbackName: SimilarityProviderName,
) {
  const name = (job.provider ?? fallbackName) as SimilarityProviderName;
  return {
    name,
    provider: resolveSimilarityProviderByName(name),
  };
}

async function pollSubmittedJob(
  job: SimilarityCheckJobRecord,
  providerName: SimilarityProviderName,
  now: Date,
): Promise<ProcessSimilarityCheckResult> {
  if (!job.externalScanId) {
    return { outcome: "processing" };
  }

  const { provider } = resolveJobProvider(job, providerName);
  const pollResult = await provider.poll(job.externalScanId);

  if (pollResult.status === "processing") {
    return { outcome: "processing" };
  }

  if (pollResult.status === "failed") {
    return failJob(job, pollResult.error, job.attemptCount + 1, now);
  }

  const reportUrl =
    pollResult.reportUrl ??
    buildSimilarityReportUrl(providerName, job.externalScanId);

  await completeSimilarityCheck(job.journalId, job.submissionId, job.id, {
    score: pollResult.score,
    reportUrl,
  });
  return { outcome: "completed", score: pollResult.score };
}

export async function processSimilarityCheck(
  job: SimilarityCheckJobRecord,
  now: Date = new Date(),
): Promise<ProcessSimilarityCheckResult> {
  const journalProvider = await resolveSimilarityProviderForJournal(job.journalId);
  const providerName = journalProvider.name as SimilarityProviderName;

  if (job.status === "SUBMITTED") {
    return pollSubmittedJob(job, providerName, now);
  }

  if (job.status !== "PENDING") {
    return { outcome: "skipped", reason: `status_${job.status.toLowerCase()}` };
  }

  const manuscript = await loadLatestManuscriptFile(job.journalId, job.submissionId);
  if (!manuscript) {
    return failJob(
      job,
      "Manuscript file not found for similarity check.",
      job.attemptCount + 1,
      now,
    );
  }

  let content: Buffer;
  try {
    content = await downloadManuscriptBytes(manuscript.storageKey);
  } catch (error) {
    return failJob(
      job,
      error instanceof Error ? error.message : "Failed to download manuscript.",
      job.attemptCount + 1,
      now,
    );
  }

  const provider = journalProvider;
  const scanId = job.externalScanId ?? buildScanId(job);
  const result = await provider.submit({
    scanId,
    filename: manuscript.originalName,
    mimeType: manuscript.mimeType,
    content,
  });

  if (result.status === "failed") {
    return failJob(job, result.error, job.attemptCount + 1, now);
  }

  if (result.status === "completed") {
    await completeSimilarityCheck(job.journalId, job.submissionId, job.id, {
      score: result.score,
      reportUrl: result.reportUrl,
    });
    return { outcome: "completed", score: result.score };
  }

  await updateSimilarityCheckJob(job.journalId, job.id, {
    status: "SUBMITTED",
    provider: provider.name,
    externalScanId: result.externalScanId,
    attemptCount: job.attemptCount + 1,
    nextRetryAt: null,
    lastError: null,
  });
  return { outcome: "submitted", externalScanId: result.externalScanId };
}

export async function completeSimilarityFromWebhook(input: {
  externalScanId: string;
  score: number;
  provider?: SimilarityProviderName | string;
  reportUrl?: string | null;
}): Promise<ProcessSimilarityCheckResult> {
  const { findSimilarityJobByExternalScanId } = await import(
    "@/infrastructure/similarity/similarity-repository"
  );
  const job = await findSimilarityJobByExternalScanId(input.externalScanId);
  if (!job || job.status === "COMPLETED") {
    return { outcome: "skipped", reason: "job_not_found_or_done" };
  }

  const providerName = (input.provider ??
    job.provider ??
    "copyleaks") as SimilarityProviderName;
  const reportUrl =
    input.reportUrl ??
    buildSimilarityReportUrl(providerName, input.externalScanId);

  await completeSimilarityCheck(job.journalId, job.submissionId, job.id, {
    score: input.score,
    reportUrl,
  });
  return { outcome: "completed", score: input.score };
}
