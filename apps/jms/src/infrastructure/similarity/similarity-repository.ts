import "server-only";

import type { SimilarityCheckJobStatus } from "@/domain/similarity/types";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { prisma } from "@/infrastructure/db/prisma";

export type SimilarityCheckJobRecord = {
  id: string;
  journalId: string;
  submissionId: string;
  fileId: string;
  status: SimilarityCheckJobStatus;
  provider: string | null;
  externalScanId: string | null;
  attemptCount: number;
  nextRetryAt: Date | null;
  lastError: string | null;
};

export type ManuscriptFileContext = {
  fileId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
};

export async function findSimilarityCheckJob(
  journalId: string,
  submissionId: string,
): Promise<SimilarityCheckJobRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.similarityCheckJob.findFirst({
      where: { journalId, submissionId },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        fileId: true,
        status: true,
        provider: true,
        externalScanId: true,
        attemptCount: true,
        nextRetryAt: true,
        lastError: true,
      },
    }),
  );
}

export async function createSimilarityCheckJob(
  journalId: string,
  submissionId: string,
  fileId: string,
): Promise<SimilarityCheckJobRecord> {
  return withTenant(journalId, (tx) =>
    tx.similarityCheckJob.upsert({
      where: { submissionId },
      create: {
        journalId,
        submissionId,
        fileId,
        status: "PENDING",
      },
      update: {
        fileId,
        status: "PENDING",
        provider: null,
        externalScanId: null,
        attemptCount: 0,
        nextRetryAt: null,
        lastError: null,
      },
      select: {
        id: true,
        journalId: true,
        submissionId: true,
        fileId: true,
        status: true,
        provider: true,
        externalScanId: true,
        attemptCount: true,
        nextRetryAt: true,
        lastError: true,
      },
    }),
  );
}

export async function markSubmissionSimilarityPending(
  journalId: string,
  submissionId: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submission.update({
      where: { id: submissionId },
      data: {
        similarityStatus: "PENDING",
        similarityScore: null,
        similarityReportUrl: null,
      },
    }),
  );
}

export async function updateSimilarityCheckJob(
  journalId: string,
  jobId: string,
  data: {
    status?: SimilarityCheckJobStatus;
    provider?: string | null;
    externalScanId?: string | null;
    attemptCount?: number;
    nextRetryAt?: Date | null;
    lastError?: string | null;
  },
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.similarityCheckJob.update({
      where: { id: jobId },
      data,
    }),
  );
}

export async function completeSimilarityCheck(
  journalId: string,
  submissionId: string,
  jobId: string,
  result: {
    score: number;
    reportUrl: string | null;
  },
): Promise<void> {
  await withTenant(journalId, async (tx) => {
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        similarityStatus: "COMPLETED",
        similarityScore: result.score,
        similarityReportUrl: result.reportUrl,
      },
    });
    await tx.similarityCheckJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        nextRetryAt: null,
        lastError: null,
      },
    });
  });
}

export async function failSimilarityCheck(
  journalId: string,
  submissionId: string,
  jobId: string,
  error: string,
): Promise<void> {
  await withTenant(journalId, async (tx) => {
    await tx.submission.update({
      where: { id: submissionId },
      data: { similarityStatus: "FAILED" },
    });
    await tx.similarityCheckJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        nextRetryAt: null,
        lastError: error,
      },
    });
  });
}

export async function loadLatestManuscriptFile(
  journalId: string,
  submissionId: string,
): Promise<ManuscriptFileContext | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: { reviewRound: true },
    });
    if (!submission) {
      return null;
    }

    const manuscript = await tx.submissionFile.findFirst({
      where: {
        submissionId,
        type: "MANUSCRIPT",
        round: submission.reviewRound,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!manuscript) {
      const fallback = await tx.submissionFile.findFirst({
        where: {
          submissionId,
          type: "MANUSCRIPT",
          round: 0,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      });
      if (!fallback) {
        return null;
      }
      return {
        fileId: fallback.id,
        storageKey: fallback.storageKey,
        originalName: fallback.originalName,
        mimeType: fallback.mimeType,
      };
    }

    return {
      fileId: manuscript.id,
      storageKey: manuscript.storageKey,
      originalName: manuscript.originalName,
      mimeType: manuscript.mimeType,
    };
  });
}

export async function listDueSimilarityCheckJobs(
  now: Date,
  limit = 25,
): Promise<SimilarityCheckJobRecord[]> {
  return prisma.similarityCheckJob.findMany({
    where: {
      status: { in: ["PENDING", "SUBMITTED"] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      journalId: true,
      submissionId: true,
      fileId: true,
      status: true,
      provider: true,
      externalScanId: true,
      attemptCount: true,
      nextRetryAt: true,
      lastError: true,
    },
  });
}

export async function findSimilarityJobByExternalScanId(
  externalScanId: string,
): Promise<SimilarityCheckJobRecord | null> {
  return prisma.similarityCheckJob.findFirst({
    where: { externalScanId },
    select: {
      id: true,
      journalId: true,
      submissionId: true,
      fileId: true,
      status: true,
      provider: true,
      externalScanId: true,
      attemptCount: true,
      nextRetryAt: true,
      lastError: true,
    },
  });
}

export async function hasProcessedSimilarityWebhook(
  eventId: string,
): Promise<boolean> {
  const existing = await prisma.processedWebhook.findUnique({
    where: { eventId },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function markSimilarityWebhookProcessed(
  source: string,
  eventId: string,
): Promise<void> {
  await prisma.processedWebhook.create({
    data: {
      eventId,
      source,
    },
  });
}

export async function hasProcessedCopyleaksWebhook(
  eventId: string,
): Promise<boolean> {
  return hasProcessedSimilarityWebhook(eventId);
}

export async function markCopyleaksWebhookProcessed(
  eventId: string,
): Promise<void> {
  await markSimilarityWebhookProcessed("copyleaks", eventId);
}
