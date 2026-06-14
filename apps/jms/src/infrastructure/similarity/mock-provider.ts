import "server-only";

import { createHash } from "node:crypto";

import type {
  SimilarityPollResult,
  SimilarityProvider,
  SimilaritySubmitInput,
  SimilaritySubmitResult,
} from "@/infrastructure/similarity/provider";

/** Deterministic dev/test provider when no external API credentials are set. */
export class MockSimilarityProvider implements SimilarityProvider {
  readonly name = "mock";

  async submit(input: SimilaritySubmitInput): Promise<SimilaritySubmitResult> {
    const digest = createHash("sha256").update(input.content).digest();
    const raw = digest.readUInt16BE(0);
    const score = Math.round((raw / 65535) * 40 * 10) / 10;

    return {
      status: "completed",
      score,
      reportUrl: null,
      externalScanId: input.scanId,
    };
  }

  async poll(): Promise<SimilarityPollResult> {
    return { status: "processing" };
  }
}
