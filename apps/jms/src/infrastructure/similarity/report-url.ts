import "server-only";

import { buildCopyleaksReportUrl } from "@/infrastructure/similarity/copyleaks-client";
import { buildIThenticateReportUrl } from "@/infrastructure/similarity/ithenticate-client";
import { resolveIThenticateCredentials } from "@/infrastructure/similarity/ithenticate-credentials";
import type { SimilarityProviderName } from "@/domain/similarity/types";

export function buildSimilarityReportUrl(
  provider: SimilarityProviderName | string,
  externalScanId: string,
): string | null {
  if (provider === "copyleaks") {
    return buildCopyleaksReportUrl(externalScanId);
  }

  if (provider === "ithenticate") {
    const credentials = resolveIThenticateCredentials();
    if (!credentials) {
      return null;
    }
    const submissionId = externalScanId.split(":")[0];
    if (!submissionId) {
      return null;
    }
    return buildIThenticateReportUrl(credentials, submissionId);
  }

  return null;
}
