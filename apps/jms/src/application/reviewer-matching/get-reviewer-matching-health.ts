import "server-only";

import { MOCK_EMBEDDING_DIMENSIONS } from "@/domain/reviewer-matching/embedding";
import {
  REVIEWER_EMBEDDING_BATCH_LIMIT,
  REVIEWER_EMBEDDING_WEIGHT,
  REVIEWER_KEYWORD_WEIGHT,
  REVIEWER_SUGGESTION_TOP_N,
} from "@/domain/reviewer-matching/types";
import { countPendingReviewerEmbeddings } from "@/application/reviewer-matching/process-pending-reviewer-embeddings";
import { resolveOpenAiCredentials } from "@/infrastructure/ai/credentials";

export async function getReviewerMatchingHealth() {
  const openAiConfigured = Boolean(resolveOpenAiCredentials());
  const pendingRefreshCount = await countPendingReviewerEmbeddings();

  return {
    ok: true as const,
    activeProvider: openAiConfigured ? "openai" : "mock",
    defaultTopN: REVIEWER_SUGGESTION_TOP_N,
    keywordWeight: REVIEWER_KEYWORD_WEIGHT,
    embeddingWeight: REVIEWER_EMBEDDING_WEIGHT,
    mockEmbeddingDimensions: MOCK_EMBEDDING_DIMENSIONS,
    embeddingPersistence: true,
    embeddingBatchLimit: REVIEWER_EMBEDDING_BATCH_LIMIT,
    pendingRefreshCount,
    features: {
      keywordMatching: true,
      semanticEmbedding: true,
      embeddingPersistence: true,
      profileUpsert: true,
      embeddingCronRefresh: true,
      maxLoadFilter: true,
      coiWarnings: true,
      coiCoAuthorHistory: true,
      editorSuggestionsOnly: true,
      deskReviewUi: true,
    },
  };
}
