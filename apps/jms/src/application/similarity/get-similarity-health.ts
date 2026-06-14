import "server-only";

import { SIMILARITY_CHECK_BACKOFF_MS } from "@/domain/similarity/retry";
import {
  SIMILARITY_CHECK_JOB_STATUSES,
  SIMILARITY_CHECK_MAX_ATTEMPTS,
  SIMILARITY_HIGH_THRESHOLD,
  SIMILARITY_PROVIDERS,
  SIMILARITY_STATUSES,
} from "@/domain/similarity/types";
import { resolveCopyleaksCredentials } from "@/infrastructure/similarity/credentials";
import { resolveIThenticateCredentials } from "@/infrastructure/similarity/ithenticate-credentials";
import { getActivePlatformProviderName } from "@/infrastructure/similarity/resolve-provider";
import { SIMILARITY_GATE_POLICIES } from "@/domain/similarity/types";

export function getSimilarityHealth() {
  const copyleaksConfigured = Boolean(resolveCopyleaksCredentials());
  const ithenticateConfigured = Boolean(resolveIThenticateCredentials());

  return {
    ok: true as const,
    similarityStatuses: [...SIMILARITY_STATUSES],
    checkJobStatuses: [...SIMILARITY_CHECK_JOB_STATUSES],
    providers: [...SIMILARITY_PROVIDERS],
    gatePolicies: [...SIMILARITY_GATE_POLICIES],
    activeProvider: getActivePlatformProviderName(),
    highThresholdPercent: SIMILARITY_HIGH_THRESHOLD,
    maxAttempts: SIMILARITY_CHECK_MAX_ATTEMPTS,
    retryBackoffMs: [...SIMILARITY_CHECK_BACKOFF_MS],
    features: {
      similarityOnDeskReview: true,
      copyleaksIntegration: true,
      ithenticateIntegration: true,
      mockProviderFallback: true,
      copyleaksWebhook: true,
      turnitinWebhook: true,
      similarityGate: true,
      jobRetry: true,
      submittedJobPolling: true,
      deskReviewUi: true,
      similaritySettingsAdminUi: true,
    },
    configured: {
      copyleaks: copyleaksConfigured,
      ithenticate: ithenticateConfigured,
    },
  };
}
