import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshReviewerEmbedding } from "@/application/reviewer-matching/refresh-reviewer-embedding";
import {
  embeddingSourceFingerprint,
} from "@/domain/reviewer-matching/embedding";
import { MOCK_EMBEDDING_MODEL_ID } from "@/domain/reviewer-matching/types";
import { MockEmbeddingProvider } from "@/infrastructure/ai/mock-embedding-provider";

const findReviewerProfileByUserId = vi.fn();
const saveReviewerProfileEmbedding = vi.fn();

vi.mock("@/infrastructure/ai/reviewer-profile-repository", () => ({
  findReviewerProfileByUserId: (...args: unknown[]) =>
    findReviewerProfileByUserId(...args),
  saveReviewerProfileEmbedding: (...args: unknown[]) =>
    saveReviewerProfileEmbedding(...args),
}));

describe("refreshReviewerEmbedding", () => {
  beforeEach(() => {
    findReviewerProfileByUserId.mockReset();
    saveReviewerProfileEmbedding.mockReset();
  });

  it("embeds and persists when profile is missing a vector", async () => {
    const keywords = ["machine learning", "education"];
    findReviewerProfileByUserId.mockResolvedValue({
      userId: "user-1",
      keywords,
      maxLoad: 3,
      embedding: null,
      embeddingModel: null,
      embeddingSourceHash: null,
    });

    const provider = new MockEmbeddingProvider();
    const result = await refreshReviewerEmbedding({
      userId: "user-1",
      provider,
      modelId: MOCK_EMBEDDING_MODEL_ID,
    });

    expect(result).toEqual({ outcome: "refreshed" });
    expect(saveReviewerProfileEmbedding).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        embeddingModel: MOCK_EMBEDDING_MODEL_ID,
        embeddingSourceHash: embeddingSourceFingerprint(keywords),
      }),
    );
  });

  it("skips when fingerprint and model already match", async () => {
    const keywords = ["nlp"];
    const fingerprint = embeddingSourceFingerprint(keywords);
    const provider = new MockEmbeddingProvider();

    findReviewerProfileByUserId.mockResolvedValue({
      userId: "user-2",
      keywords,
      maxLoad: 3,
      embedding: [0.1, 0.2],
      embeddingModel: MOCK_EMBEDDING_MODEL_ID,
      embeddingSourceHash: fingerprint,
    });

    const result = await refreshReviewerEmbedding({
      userId: "user-2",
      provider,
      modelId: MOCK_EMBEDDING_MODEL_ID,
    });

    expect(result).toEqual({ outcome: "skipped", reason: "up_to_date" });
    expect(saveReviewerProfileEmbedding).not.toHaveBeenCalled();
  });
});
