import { describe, expect, it } from "vitest";

import {
  computeSimilarityNextRetryAt,
  shouldRetrySimilarityCheck,
  SIMILARITY_CHECK_BACKOFF_MS,
} from "@/domain/similarity/retry";
import {
  classifySimilarityScore,
  formatSimilarityScore,
} from "@/domain/similarity/score";
import {
  evaluateSimilarityGate,
  resolveSimilarityBlockThreshold,
} from "@/domain/similarity/gate";
import { SIMILARITY_CHECK_MAX_ATTEMPTS } from "@/domain/similarity/types";
import { MockSimilarityProvider } from "@/infrastructure/similarity/mock-provider";
import { parseCopyleaksWebhookPayload } from "@/infrastructure/similarity/copyleaks-client";
import { parseIThenticateWebhookPayload } from "@/infrastructure/similarity/ithenticate-client";

describe("similarity domain", () => {
  describe("classifySimilarityScore", () => {
    it("classifies low, moderate, and high scores", () => {
      expect(classifySimilarityScore(5)).toBe("low");
      expect(classifySimilarityScore(15)).toBe("moderate");
      expect(classifySimilarityScore(30)).toBe("high");
    });
  });

  describe("formatSimilarityScore", () => {
    it("formats percentage with one decimal", () => {
      expect(formatSimilarityScore(12.34)).toBe("12.3%");
    });
  });

  describe("retry backoff", () => {
    it("schedules increasing delays", () => {
      const now = new Date("2026-06-09T00:00:00.000Z");
      const first = computeSimilarityNextRetryAt(0, now);
      expect(first?.getTime()).toBe(
        now.getTime() + SIMILARITY_CHECK_BACKOFF_MS[0],
      );
    });

    it("stops after max attempts", () => {
      expect(
        computeSimilarityNextRetryAt(SIMILARITY_CHECK_MAX_ATTEMPTS, new Date()),
      ).toBeNull();
      expect(shouldRetrySimilarityCheck(SIMILARITY_CHECK_MAX_ATTEMPTS)).toBe(
        false,
      );
    });
  });
});

describe("MockSimilarityProvider", () => {
  it("returns deterministic completed score from file content", async () => {
    const provider = new MockSimilarityProvider();
    const first = await provider.submit({
      scanId: "scan-1",
      filename: "paper.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("hello world"),
    });
    const second = await provider.submit({
      scanId: "scan-2",
      filename: "paper.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("hello world"),
    });

    expect(first.status).toBe("completed");
    if (first.status === "completed") {
      expect(first.score).toBeGreaterThanOrEqual(0);
      expect(first.score).toBeLessThanOrEqual(40);
      expect(second.status).toBe("completed");
      if (second.status === "completed") {
        expect(second.score).toBe(first.score);
      }
    }
  });
});

describe("similarity gate", () => {
  it("allows send when policy is OFF", () => {
    const result = evaluateSimilarityGate({
      policy: "OFF",
      thresholdPercent: 25,
      status: "COMPLETED",
      score: 40,
      acknowledgedHighSimilarity: false,
    });
    expect(result.blocked).toBe(false);
  });

  it("blocks high score under BLOCK policy", () => {
    const result = evaluateSimilarityGate({
      policy: "BLOCK",
      thresholdPercent: 25,
      status: "COMPLETED",
      score: 30,
      acknowledgedHighSimilarity: false,
    });
    expect(result.blocked).toBe(true);
  });

  it("requires acknowledgment under WARN policy for high score", () => {
    const withoutAck = evaluateSimilarityGate({
      policy: "WARN",
      thresholdPercent: 25,
      status: "COMPLETED",
      score: 30,
      acknowledgedHighSimilarity: false,
    });
    expect(withoutAck.blocked).toBe(true);
    expect(withoutAck.requiresAcknowledgment).toBe(true);

    const withAck = evaluateSimilarityGate({
      policy: "WARN",
      thresholdPercent: 25,
      status: "COMPLETED",
      score: 30,
      acknowledgedHighSimilarity: true,
    });
    expect(withAck.blocked).toBe(false);
  });

  it("blocks pending check under BLOCK policy", () => {
    const result = evaluateSimilarityGate({
      policy: "BLOCK",
      thresholdPercent: 25,
      status: "PENDING",
      score: null,
      acknowledgedHighSimilarity: false,
    });
    expect(result.blocked).toBe(true);
  });

  it("falls back to default threshold when journal value is invalid", () => {
    expect(resolveSimilarityBlockThreshold(null)).toBe(25);
    expect(resolveSimilarityBlockThreshold(30)).toBe(30);
  });
});

describe("Copyleaks webhook parser", () => {
  it("extracts aggregated score from completed payload", () => {
    const result = parseCopyleaksWebhookPayload({
      status: 0,
      scannedDocument: { scanId: "scan-abc" },
      results: {
        score: { aggregatedScore: 18.5 },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.completed) {
      expect(result.score).toBe(18.5);
    }
  });
});

describe("iThenticate webhook parser", () => {
  it("extracts score from completed report payload", () => {
    const result = parseIThenticateWebhookPayload({
      submission_id: "sub-1",
      similarity_report_id: "rep-1",
      status: "COMPLETE",
      overall_match_percentage: 22.5,
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.completed) {
      expect(result.score).toBe(22.5);
    }
  });
});
