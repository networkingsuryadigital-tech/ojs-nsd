import "server-only";

import { evaluateProductionReadiness } from "@/domain/operational/production-readiness";
import { getActiveEmbeddingProviderName } from "@/infrastructure/ai/resolve-embedding-provider";
import { alertProductionReadinessIfNeeded } from "@/infrastructure/observability/alert-production-readiness";
import { getActivePlatformProviderName } from "@/infrastructure/similarity/resolve-provider";
import { env } from "@/lib/env";

export function getOperationalHealth() {
  const oaiRateLimitPerMinute = resolveOaiRateLimitPerMinute();
  const redisConfigured = Boolean(
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
  );
  const resendConfigured = Boolean(env.RESEND_API_KEY);
  const similarityProviderActive = getActivePlatformProviderName();
  const embeddingProviderActive = getActiveEmbeddingProviderName();
  const explicitMockSimilarity =
    env.SIMILARITY_PROVIDER?.trim().toLowerCase() === "mock";
  const nodeEnv = process.env.NODE_ENV ?? "development";

  const { productionReady, warnings } = evaluateProductionReadiness({
    nodeEnv,
    similarityProviderActive,
    embeddingProviderActive,
    explicitMockSimilarity,
    redisConfigured,
  });

  alertProductionReadinessIfNeeded({ nodeEnv, productionReady, warnings });

  return {
    ok: productionReady as boolean,
    oaiRateLimitPerMinute,
    redisConfigured,
    resendConfigured,
    similarityProviderActive,
    embeddingProviderActive,
    productionReady,
    warnings,
    features: {
      oaiRateLimiting: true,
      oaiRetryAfterHeader: true,
      journalEmailFromSettings: true,
      journalEmailSettingsAdminUi: true,
    },
  };
}

export function resolveOaiRateLimitPerMinute(): number {
  const raw = process.env.OAI_RATE_LIMIT_PER_MIN;
  if (!raw?.trim()) {
    return 30;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 5 || parsed > 300) {
    return 30;
  }
  return parsed;
}
