import type { SimilarityProviderName } from "@/domain/similarity/types";

export type EmbeddingProviderName = "mock" | "openai";

export type ProductionReadinessInput = {
  nodeEnv: string;
  similarityProviderActive: SimilarityProviderName;
  embeddingProviderActive: EmbeddingProviderName;
  explicitMockSimilarity: boolean;
  redisConfigured: boolean;
};

export type ProductionReadinessResult = {
  productionReady: boolean;
  warnings: string[];
};

export function evaluateProductionReadiness(
  input: ProductionReadinessInput,
): ProductionReadinessResult {
  const warnings: string[] = [];

  if (input.nodeEnv !== "production") {
    return { productionReady: true, warnings };
  }

  if (
    input.similarityProviderActive === "mock" &&
    !input.explicitMockSimilarity
  ) {
    warnings.push(
      "Similarity provider is mock — set SIMILARITY_PROVIDER=ithenticate|copyleaks with credentials, or SIMILARITY_PROVIDER=mock only for demo.",
    );
  }

  if (input.embeddingProviderActive === "mock") {
    warnings.push(
      "Embedding provider is mock — set OPENAI_API_KEY for AI reviewer matching.",
    );
  }

  if (!input.redisConfigured) {
    warnings.push(
      "Upstash Redis not configured — OAI rate limiting and tenant cache may be degraded.",
    );
  }

  const productionReady = warnings.length === 0;
  return { productionReady, warnings };
}
