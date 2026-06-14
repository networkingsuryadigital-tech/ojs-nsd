import "server-only";

import {
  pollIThenticateScan,
  submitIThenticateFileScan,
} from "@/infrastructure/similarity/ithenticate-client";
import { resolveIThenticateCredentials } from "@/infrastructure/similarity/ithenticate-credentials";
import type {
  SimilarityPollResult,
  SimilarityProvider,
  SimilaritySubmitInput,
  SimilaritySubmitResult,
} from "@/infrastructure/similarity/provider";

export class IThenticateSimilarityProvider implements SimilarityProvider {
  readonly name = "ithenticate";

  async submit(input: SimilaritySubmitInput): Promise<SimilaritySubmitResult> {
    const credentials = resolveIThenticateCredentials();
    if (!credentials) {
      return {
        status: "failed",
        error: "iThenticate credentials are not configured.",
        retryable: false,
      };
    }

    const result = await submitIThenticateFileScan({
      credentials,
      scanId: input.scanId,
      filename: input.filename,
      content: input.content,
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
        reportUrl: result.reportUrl,
        externalScanId: result.externalScanId,
      };
    }

    return {
      status: "submitted",
      externalScanId: result.externalScanId,
    };
  }

  async poll(externalScanId: string): Promise<SimilarityPollResult> {
    const credentials = resolveIThenticateCredentials();
    if (!credentials) {
      return {
        status: "failed",
        error: "iThenticate credentials are not configured.",
        retryable: false,
      };
    }

    const result = await pollIThenticateScan({ credentials, externalScanId });
    if (!result.ok) {
      return {
        status: "failed",
        error: result.error,
        retryable: result.retryable,
      };
    }

    if (result.completed) {
      return {
        status: "completed",
        score: result.score,
        reportUrl: result.reportUrl,
      };
    }

    return { status: "processing" };
  }
}
