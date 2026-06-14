import "server-only";

import { shouldRefreshEmbedding } from "@/domain/reviewer-matching/embedding";
import { REVIEWER_EMBEDDING_BATCH_LIMIT } from "@/domain/reviewer-matching/types";
import { refreshReviewerEmbedding } from "@/application/reviewer-matching/refresh-reviewer-embedding";
import { resolveEmbeddingModelId } from "@/infrastructure/ai/resolve-embedding-model-id";
import { listReviewerProfilesForActiveJournalReviewers } from "@/infrastructure/ai/reviewer-profile-repository";

export type ProcessPendingReviewerEmbeddingsResult = {
  scanned: number;
  refreshed: number;
  skipped: number;
  failed: number;
};

export async function processPendingReviewerEmbeddings(): Promise<ProcessPendingReviewerEmbeddingsResult> {
  const modelId = resolveEmbeddingModelId();
  const profiles = await listReviewerProfilesForActiveJournalReviewers();

  const pending = profiles.filter((profile) =>
    shouldRefreshEmbedding(
      profile.keywords,
      {
        embedding: profile.embedding,
        embeddingModel: profile.embeddingModel,
        embeddingSourceHash: profile.embeddingSourceHash,
      },
      modelId,
    ),
  );

  const batch = pending.slice(0, REVIEWER_EMBEDDING_BATCH_LIMIT);
  const result: ProcessPendingReviewerEmbeddingsResult = {
    scanned: batch.length,
    refreshed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const profile of batch) {
    const outcome = await refreshReviewerEmbedding({
      userId: profile.userId,
      keywords: profile.keywords,
      modelId,
    });

    switch (outcome.outcome) {
      case "refreshed":
        result.refreshed += 1;
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

export async function countPendingReviewerEmbeddings(): Promise<number> {
  const modelId = resolveEmbeddingModelId();
  const profiles = await listReviewerProfilesForActiveJournalReviewers();

  return profiles.filter((profile) =>
    shouldRefreshEmbedding(
      profile.keywords,
      {
        embedding: profile.embedding,
        embeddingModel: profile.embeddingModel,
        embeddingSourceHash: profile.embeddingSourceHash,
      },
      modelId,
    ),
  ).length;
}
