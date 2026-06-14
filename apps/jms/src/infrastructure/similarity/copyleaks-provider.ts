import "server-only";

import { env } from "@/lib/env";
import {
  buildCopyleaksReportUrl,
  submitCopyleaksFileScan,
} from "@/infrastructure/similarity/copyleaks-client";
import { resolveCopyleaksCredentials } from "@/infrastructure/similarity/credentials";
import type {
  SimilarityPollResult,
  SimilarityProvider,
  SimilaritySubmitInput,
  SimilaritySubmitResult,
} from "@/infrastructure/similarity/provider";

function resolveStatusWebhookUrl(): string | null {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return null;
  }
  return `${base}/api/webhooks/copyleaks/{STATUS}`;
}

export class CopyleaksSimilarityProvider implements SimilarityProvider {
  readonly name = "copyleaks";

  async submit(input: SimilaritySubmitInput): Promise<SimilaritySubmitResult> {
    const credentials = resolveCopyleaksCredentials();
    if (!credentials) {
      return {
        status: "failed",
        error: "Copyleaks credentials are not configured.",
        retryable: false,
      };
    }

    const result = await submitCopyleaksFileScan({
      credentials,
      scanId: input.scanId,
      filename: input.filename,
      content: input.content,
      statusWebhookUrl: resolveStatusWebhookUrl(),
    });

    if (!result.ok) {
      return {
        status: "failed",
        error: result.error,
        retryable: result.retryable,
      };
    }

    if (result.completed && result.score !== null) {
      return {
        status: "completed",
        score: result.score,
        reportUrl: buildCopyleaksReportUrl(result.scanId),
        externalScanId: result.scanId,
      };
    }

    return {
      status: "submitted",
      externalScanId: result.scanId,
    };
  }

  async poll(): Promise<SimilarityPollResult> {
    return { status: "processing" };
  }
}
