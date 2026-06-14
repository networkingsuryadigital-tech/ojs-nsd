import "server-only";

import type {
  DoiDepositJobStatus,
  DoiDepositKind,
  DoiStatus,
} from "@/domain/doi/types";
import { buildArticleUrl } from "@/domain/oai/dublin-core";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type DoiDepositJobRecord = {
  id: string;
  journalId: string;
  submissionId: string;
  doi: string | null;
  depositKind: DoiDepositKind;
  status: DoiDepositJobStatus;
  crossrefBatchId: string | null;
  attemptCount: number;
  nextRetryAt: Date | null;
  lastError: string | null;
};

export type DoiDepositContext = {
  journal: {
    id: string;
    name: string;
    publisher: string | null;
    issnPrint: string | null;
    issnOnline: string | null;
    doiPrefix: string | null;
    crossrefDepositorName: string | null;
    crossrefCredentialRef: string | null;
  };
  submission: {
    id: string;
    doi: string | null;
    doiStatus: DoiStatus;
    status: "PUBLISHED" | "RETRACTED";
    publishedAt: Date | null;
    primaryLanguage: string;
    issueId: string | null;
    publicationNoticeType: "RETRACTION" | "CORRECTION" | "ERRATUM" | null;
    publicationNoticeReason: string | null;
  };
  issue: {
    volume: number;
    number: number;
    year: number;
  } | null;
  primaryTitle: string;
  authors: Array<{
    fullName: string;
    orcid: string | null;
    order: number;
  }>;
  articleUrl: string;
};

export async function findDoiDepositJob(
  journalId: string,
  submissionId: string,
): Promise<DoiDepositJobRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.doiDepositJob.findFirst({
      where: { journalId, submissionId },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        doi: true,
        depositKind: true,
        status: true,
        crossrefBatchId: true,
        attemptCount: true,
        nextRetryAt: true,
        lastError: true,
      },
    }),
  );
}

export async function createDoiDepositJob(
  journalId: string,
  submissionId: string,
): Promise<DoiDepositJobRecord> {
  return withTenant(journalId, (tx) =>
    tx.doiDepositJob.create({
      data: {
        journalId,
        submissionId,
        status: "PENDING",
      },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        doi: true,
        depositKind: true,
        status: true,
        crossrefBatchId: true,
        attemptCount: true,
        nextRetryAt: true,
        lastError: true,
      },
    }),
  );
}

export async function requeueDoiDepositJob(
  journalId: string,
  submissionId: string,
  depositKind: DoiDepositKind,
): Promise<DoiDepositJobRecord | null> {
  const existing = await findDoiDepositJob(journalId, submissionId);
  if (!existing) {
    return null;
  }

  await updateDoiDepositJob(journalId, existing.id, {
    depositKind,
    status: "PENDING",
    crossrefBatchId: null,
    attemptCount: 0,
    nextRetryAt: null,
    lastError: null,
  });

  return {
    ...existing,
    depositKind,
    status: "PENDING",
    crossrefBatchId: null,
    attemptCount: 0,
    nextRetryAt: null,
    lastError: null,
  };
}

export async function markSubmissionDoiPending(
  journalId: string,
  submissionId: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submission.update({
      where: { id: submissionId },
      data: { doiStatus: "PENDING" },
    }),
  );
}

export async function updateDoiDepositJob(
  journalId: string,
  jobId: string,
  data: {
    doi?: string | null;
    depositKind?: DoiDepositKind;
    status?: DoiDepositJobStatus;
    crossrefBatchId?: string | null;
    attemptCount?: number;
    nextRetryAt?: Date | null;
    lastError?: string | null;
  },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.doiDepositJob.update({
      where: { id: jobId },
      data,
    }),
  );
}

export async function updateSubmissionDoi(
  journalId: string,
  submissionId: string,
  data: { doi: string; doiStatus: DoiStatus },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submission.update({
      where: { id: submissionId },
      data,
    }),
  );
}

export async function markSubmissionDoiFailed(
  journalId: string,
  submissionId: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submission.update({
      where: { id: submissionId },
      data: { doiStatus: "FAILED" },
    }),
  );
}

export async function loadDoiDepositContext(
  journalId: string,
  submissionId: string,
  baseSiteUrl: string,
): Promise<DoiDepositContext | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: {
        id: submissionId,
        journalId,
        status: { in: ["PUBLISHED", "RETRACTED"] },
      },
      select: {
        id: true,
        status: true,
        doi: true,
        doiStatus: true,
        publishedAt: true,
        primaryLanguage: true,
        issueId: true,
        publicationNoticeType: true,
        publicationNoticeReason: true,
        journal: {
          select: {
            id: true,
            name: true,
            publisher: true,
            issnPrint: true,
            issnOnline: true,
            doiPrefix: true,
            crossrefDepositorName: true,
            crossrefCredentialRef: true,
          },
        },
        issue: {
          select: { volume: true, number: true, year: true },
        },
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
        authors: {
          select: { fullName: true, orcid: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!submission) {
      return null;
    }

    const primaryTitle = submission.translations[0]?.title?.trim();
    if (!primaryTitle) {
      return null;
    }

    return {
      journal: submission.journal,
      submission: {
        id: submission.id,
        doi: submission.doi,
        doiStatus: submission.doiStatus,
        status: submission.status as "PUBLISHED" | "RETRACTED",
        publishedAt: submission.publishedAt,
        primaryLanguage: submission.primaryLanguage,
        issueId: submission.issueId,
        publicationNoticeType: submission.publicationNoticeType,
        publicationNoticeReason: submission.publicationNoticeReason,
      },
      issue: submission.issue,
      primaryTitle,
      authors: submission.authors,
      articleUrl: buildArticleUrl(
        baseSiteUrl,
        submission.issueId,
        submission.id,
      ),
    };
  });
}

export async function listDueDoiDepositJobs(
  now: Date,
  limit = 25,
): Promise<DoiDepositJobRecord[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.doiDepositJob.findMany({
    where: {
      status: { in: ["PENDING", "SUBMITTED"] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      journalId: true,
      submissionId: true,
      doi: true,
      depositKind: true,
      status: true,
      crossrefBatchId: true,
      attemptCount: true,
      nextRetryAt: true,
      lastError: true,
    },
  });
}

function crossRefDepositEventId(
  journalId: string,
  submissionId: string,
  depositKind: DoiDepositKind,
): string {
  return `crossref:deposit:${journalId}:${submissionId}:${depositKind}`;
}

export async function hasProcessedCrossRefDeposit(
  journalId: string,
  submissionId: string,
  depositKind: DoiDepositKind = "INITIAL",
): Promise<boolean> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const eventId = crossRefDepositEventId(journalId, submissionId, depositKind);
  const row = await adminDb.processedWebhook.findUnique({
    where: { eventId },
    select: { id: true },
  });
  return row !== null;
}

export async function markCrossRefDepositProcessed(
  journalId: string,
  submissionId: string,
  depositKind: DoiDepositKind = "INITIAL",
): Promise<void> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const eventId = crossRefDepositEventId(journalId, submissionId, depositKind);
  await adminDb.processedWebhook.upsert({
    where: { eventId },
    create: { eventId, source: "crossref" },
    update: {},
  });
}
