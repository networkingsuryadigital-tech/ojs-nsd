import "server-only";

import {
  embeddingSourceFingerprint,
  shouldRefreshEmbedding,
} from "@/domain/reviewer-matching/embedding";
import { buildReviewerExpertiseText } from "@/domain/reviewer-matching/keywords";
import type { EmbeddingProvider } from "@/infrastructure/ai/embedding-provider";
import { resolveEmbeddingProvider } from "@/infrastructure/ai/resolve-embedding-provider";
import { resolveEmbeddingModelId } from "@/infrastructure/ai/resolve-embedding-model-id";
import {
  findReviewerProfileByUserId,
  saveReviewerProfileEmbedding,
} from "@/infrastructure/ai/reviewer-profile-repository";

export type RefreshReviewerEmbeddingResult =
  | { outcome: "refreshed" }
  | { outcome: "skipped"; reason: "up_to_date" | "empty_keywords" | "no_profile" }
  | { outcome: "failed"; error: string };

export async function refreshReviewerEmbedding(input: {
  userId: string;
  keywords?: string[];
  provider?: EmbeddingProvider;
  modelId?: string;
}): Promise<RefreshReviewerEmbeddingResult> {
  const modelId = input.modelId ?? resolveEmbeddingModelId();
  const provider = input.provider ?? resolveEmbeddingProvider();

  const profile = await findReviewerProfileByUserId(input.userId);
  const keywords = input.keywords ?? profile?.keywords ?? [];

  if (!profile && !input.keywords) {
    return { outcome: "skipped", reason: "no_profile" };
  }

  const stored = {
    embedding: profile?.embedding ?? null,
    embeddingModel: profile?.embeddingModel ?? null,
    embeddingSourceHash: profile?.embeddingSourceHash ?? null,
  };

  if (!shouldRefreshEmbedding(keywords, stored, modelId)) {
    return { outcome: "skipped", reason: "up_to_date" };
  }

  const expertiseText = buildReviewerExpertiseText(keywords);
  if (expertiseText.length === 0) {
    return { outcome: "skipped", reason: "empty_keywords" };
  }

  try {
    const embedding = await provider.embed(expertiseText);
    await saveReviewerProfileEmbedding(input.userId, {
      embedding,
      embeddingModel: modelId,
      embeddingSourceHash: embeddingSourceFingerprint(keywords),
    });
    return { outcome: "refreshed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Embedding refresh failed.";
    return { outcome: "failed", error: message };
  }
}
