import "server-only";

import { buildDoi, buildDoiSuffix } from "@/domain/doi/identifier";
import { computeNextRetryAt, shouldRetryDeposit } from "@/domain/doi/retry";
import { env } from "@/lib/env";
import { resolveCrossRefCredentials } from "@/infrastructure/crossref/credentials";
import {
  fetchCrossRefDepositStatus,
  submitCrossRefDeposit,
} from "@/infrastructure/crossref/deposit-client";
import {
  hasProcessedCrossRefDeposit,
  loadDoiDepositContext,
  markCrossRefDepositProcessed,
  markSubmissionDoiFailed,
  updateDoiDepositJob,
  updateSubmissionDoi,
  type DoiDepositJobRecord,
} from "@/infrastructure/crossref/doi-repository";
import {
  buildCrossRefDepositXml,
  buildCrossRefUpdateXml,
} from "@/infrastructure/crossref/xml-builder";
import { formatPublicationNoticeDescription } from "@/domain/publication/notice";

export type ProcessDoiDepositResult =
  | { outcome: "registered"; doi: string }
  | { outcome: "submitted"; batchId: string }
  | { outcome: "processing" }
  | { outcome: "retry_scheduled"; attemptCount: number; nextRetryAt: Date }
  | { outcome: "failed"; error: string }
  | { outcome: "skipped"; reason: string };

function resolveBaseSiteUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

async function failJob(
  job: DoiDepositJobRecord,
  error: string,
  attemptCount: number,
  now: Date,
): Promise<ProcessDoiDepositResult> {
  const nextRetryAt = computeNextRetryAt(attemptCount, now);
  if (nextRetryAt && shouldRetryDeposit(attemptCount)) {
    await updateDoiDepositJob(job.journalId, job.id, {
      attemptCount,
      nextRetryAt,
      lastError: error,
    });
    return { outcome: "retry_scheduled", attemptCount, nextRetryAt };
  }

  await updateDoiDepositJob(job.journalId, job.id, {
    status: "FAILED",
    attemptCount,
    nextRetryAt: null,
    lastError: error,
  });
  await markSubmissionDoiFailed(job.journalId, job.submissionId);
  return { outcome: "failed", error };
}

export async function processDoiDeposit(
  job: DoiDepositJobRecord,
  now: Date = new Date(),
): Promise<ProcessDoiDepositResult> {
  if (
    await hasProcessedCrossRefDeposit(
      job.journalId,
      job.submissionId,
      job.depositKind,
    )
  ) {
    return { outcome: "skipped", reason: "already_processed" };
  }

  const context = await loadDoiDepositContext(
    job.journalId,
    job.submissionId,
    resolveBaseSiteUrl(),
  );
  if (!context) {
    return failJob(job, "Published submission context not found.", job.attemptCount + 1, now);
  }

  const doiPrefix = context.journal.doiPrefix?.trim();
  if (!doiPrefix) {
    return { outcome: "skipped", reason: "no_doi_prefix" };
  }

  const credentials = resolveCrossRefCredentials({
    crossrefDepositorName: context.journal.crossrefDepositorName,
    crossrefCredentialRef: context.journal.crossrefCredentialRef,
    journalPublisher: context.journal.publisher,
    journalName: context.journal.name,
  });
  if (!credentials) {
    return failJob(
      job,
      "CrossRef credentials are not configured.",
      job.attemptCount + 1,
      now,
    );
  }

  if (!context.issue) {
    return failJob(job, "Published submission is missing issue metadata.", job.attemptCount + 1, now);
  }

  const doiSuffix = buildDoiSuffix(context.submission.id);
  const doi = context.submission.doi ?? job.doi ?? buildDoi(doiPrefix, doiSuffix);
  const publishedAt = context.submission.publishedAt ?? now;

  if (job.status === "SUBMITTED" && job.crossrefBatchId) {
    const statusResult = await fetchCrossRefDepositStatus(
      credentials,
      job.crossrefBatchId,
    );
    if (!statusResult.ok) {
      if (statusResult.retryable) {
        return failJob(job, statusResult.error, job.attemptCount + 1, now);
      }
      return failJob(job, statusResult.error, job.attemptCount + 1, now);
    }

    if (statusResult.status === "processing") {
      await updateDoiDepositJob(job.journalId, job.id, {
        doi,
        nextRetryAt: computeNextRetryAt(job.attemptCount, now),
      });
      return { outcome: "processing" };
    }

    if (statusResult.status === "failed") {
      return failJob(
        job,
        "CrossRef reported deposit failure.",
        job.attemptCount + 1,
        now,
      );
    }

    await updateDoiDepositJob(job.journalId, job.id, {
      doi,
      status: "REGISTERED",
      nextRetryAt: null,
      lastError: null,
    });
    await updateSubmissionDoi(job.journalId, job.submissionId, {
      doi,
      doiStatus: "REGISTERED",
    });
    await markCrossRefDepositProcessed(
      job.journalId,
      job.submissionId,
      job.depositKind,
    );
    return { outcome: "registered", doi };
  }

  const xmlBase = {
    batchId: `${job.journalId}:${job.submissionId}:${job.depositKind}:${job.attemptCount + 1}`,
    timestamp: Math.floor(now.getTime() / 1000),
    depositorName: credentials.depositorName,
    depositorEmail: credentials.depositorEmail,
    registrant: credentials.registrant,
    journalTitle: context.journal.name,
    issnOnline: context.journal.issnOnline,
    issnPrint: context.journal.issnPrint,
    volume: context.issue.volume,
    issueNumber: context.issue.number,
    publicationYear: context.issue.year,
    publicationDate: publishedAt,
    title: context.primaryTitle,
    authors: context.authors,
    doiPrefix,
    doiSuffix,
    resourceUrl: context.articleUrl,
  };

  const xml =
    job.depositKind === "RETRACTION" || job.depositKind === "CORRECTION"
      ? buildCrossRefUpdateXml({
          ...xmlBase,
          updateDate: now,
          updateType:
            job.depositKind === "RETRACTION" ? "retraction" : "correction",
          updateDescription: formatPublicationNoticeDescription(
            context.submission.publicationNoticeType ??
              (job.depositKind === "RETRACTION" ? "RETRACTION" : "CORRECTION"),
            context.submission.publicationNoticeReason ??
              "Publication integrity notice.",
          ),
        })
      : buildCrossRefDepositXml(xmlBase);

  const depositResult = await submitCrossRefDeposit(credentials, xml);
  if (!depositResult.ok) {
    return failJob(job, depositResult.error, job.attemptCount + 1, now);
  }

  await updateDoiDepositJob(job.journalId, job.id, {
    doi,
    status: "SUBMITTED",
    crossrefBatchId: depositResult.batchId,
    attemptCount: job.attemptCount + 1,
    nextRetryAt: computeNextRetryAt(job.attemptCount, now),
    lastError: null,
  });
  if (job.depositKind === "INITIAL") {
    await updateSubmissionDoi(job.journalId, job.submissionId, {
      doi,
      doiStatus: "PENDING",
    });
  }

  return { outcome: "submitted", batchId: depositResult.batchId };
}
