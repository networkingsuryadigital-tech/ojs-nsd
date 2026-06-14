import { describe, expect, it } from "vitest";

import { evaluateProductionReadiness } from "@/domain/operational/production-readiness";

describe("evaluateProductionReadiness", () => {
  it("returns productionReady true in non-production environments", () => {
    const result = evaluateProductionReadiness({
      nodeEnv: "development",
      similarityProviderActive: "mock",
      embeddingProviderActive: "mock",
      explicitMockSimilarity: false,
      redisConfigured: false,
    });
    expect(result.productionReady).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("returns productionReady false when mock providers in production", () => {
    const result = evaluateProductionReadiness({
      nodeEnv: "production",
      similarityProviderActive: "mock",
      embeddingProviderActive: "mock",
      explicitMockSimilarity: false,
      redisConfigured: true,
    });
    expect(result.productionReady).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("allows explicit SIMILARITY_PROVIDER=mock in production", () => {
    const result = evaluateProductionReadiness({
      nodeEnv: "production",
      similarityProviderActive: "mock",
      embeddingProviderActive: "openai",
      explicitMockSimilarity: true,
      redisConfigured: true,
    });
    expect(result.productionReady).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("warns when redis is missing in production", () => {
    const result = evaluateProductionReadiness({
      nodeEnv: "production",
      similarityProviderActive: "ithenticate",
      embeddingProviderActive: "openai",
      explicitMockSimilarity: false,
      redisConfigured: false,
    });
    expect(result.productionReady).toBe(false);
    expect(result.warnings.some((w) => w.includes("Redis"))).toBe(true);
  });
});
