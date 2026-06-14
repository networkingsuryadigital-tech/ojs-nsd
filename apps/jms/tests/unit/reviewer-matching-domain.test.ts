import { describe, expect, it } from "vitest";

import {
  buildSubmissionEmbeddingText,
  cosineSimilarity,
  embeddingSourceFingerprint,
  parseEmbeddingVector,
  shouldRefreshEmbedding,
} from "@/domain/reviewer-matching/embedding";
import { MOCK_EMBEDDING_MODEL_ID } from "@/domain/reviewer-matching/types";
import {
  computeKeywordOverlapScore,
  normalizeKeyword,
} from "@/domain/reviewer-matching/keywords";
import {
  combineMatchScores,
  rankReviewerCandidates,
} from "@/domain/reviewer-matching/rank";
import { MockEmbeddingProvider } from "@/infrastructure/ai/mock-embedding-provider";

describe("reviewer matching keywords", () => {
  it("normalizes keywords for comparison", () => {
    expect(normalizeKeyword(" Machine Learning ")).toBe("machine learning");
  });

  it("scores keyword overlap as share of submission keywords", () => {
    expect(
      computeKeywordOverlapScore(
        ["AI", "education", "nlp"],
        ["nlp", "healthcare"],
      ),
    ).toBeCloseTo(1 / 3);
  });
});

describe("reviewer matching embedding", () => {
  it("parses valid embedding vectors", () => {
    expect(parseEmbeddingVector([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    expect(parseEmbeddingVector(["bad"])).toBeNull();
  });

  it("builds submission text from title, abstract, and keywords", () => {
    expect(
      buildSubmissionEmbeddingText({
        title: "Judul",
        abstract: "Abstrak",
        keywords: ["ai", "pendidikan"],
      }),
    ).toBe("Judul\nAbstrak\nai, pendidikan");
  });

  it("computes cosine similarity between identical vectors", () => {
    const vector = [1, 0, 0];
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1);
  });

  it("fingerprints normalized keywords deterministically", () => {
    const first = embeddingSourceFingerprint(["NLP", " AI "]);
    const second = embeddingSourceFingerprint(["ai", "nlp"]);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("detects when embedding refresh is required", () => {
    const keywords = ["machine learning"];
    const fingerprint = embeddingSourceFingerprint(keywords);

    expect(
      shouldRefreshEmbedding(
        keywords,
        { embedding: null, embeddingModel: null, embeddingSourceHash: null },
        MOCK_EMBEDDING_MODEL_ID,
      ),
    ).toBe(true);

    expect(
      shouldRefreshEmbedding(
        keywords,
        {
          embedding: [0.1, 0.2],
          embeddingModel: MOCK_EMBEDDING_MODEL_ID,
          embeddingSourceHash: fingerprint,
        },
        MOCK_EMBEDDING_MODEL_ID,
      ),
    ).toBe(false);

    expect(
      shouldRefreshEmbedding(
        keywords,
        {
          embedding: [0.1, 0.2],
          embeddingModel: MOCK_EMBEDDING_MODEL_ID,
          embeddingSourceHash: fingerprint,
        },
        "text-embedding-3-large",
      ),
    ).toBe(true);

    expect(shouldRefreshEmbedding([], { embedding: null, embeddingModel: null, embeddingSourceHash: null }, MOCK_EMBEDDING_MODEL_ID)).toBe(false);
  });
});

describe("reviewer matching rank", () => {
  it("combines keyword and embedding scores with weights", () => {
    expect(combineMatchScores(0.5, 1)).toBeCloseTo(0.8);
    expect(combineMatchScores(0.5, null)).toBe(0.5);
  });

  it("ranks reviewers by combined score and filters load or COI", () => {
    const ranked = rankReviewerCandidates(
      {
        title: "AI in schools",
        abstract: "Uses NLP in classrooms",
        keywords: ["ai", "education", "nlp"],
      },
      [
        {
          userId: "r1",
          keywords: ["ai", "nlp"],
          maxLoad: 3,
          activeLoad: 1,
          embedding: [1, 0, 0],
          embeddingStale: false,
          alreadyAssigned: false,
          coiWarnings: [],
        },
        {
          userId: "r2",
          keywords: ["healthcare"],
          maxLoad: 3,
          activeLoad: 0,
          embedding: [0, 1, 0],
          embeddingStale: false,
          alreadyAssigned: false,
          coiWarnings: [],
        },
        {
          userId: "r3",
          keywords: ["ai"],
          maxLoad: 2,
          activeLoad: 2,
          embedding: [1, 0, 0],
          embeddingStale: false,
          alreadyAssigned: false,
          coiWarnings: [],
        },
        {
          userId: "r4",
          keywords: ["ai"],
          maxLoad: 3,
          activeLoad: 0,
          embedding: [1, 0, 0],
          embeddingStale: false,
          alreadyAssigned: false,
          coiWarnings: [
            {
              code: "AUTHOR_IS_REVIEWER",
              message: "Reviewer is an author.",
            },
          ],
        },
      ],
      [1, 0, 0],
      { topN: 3 },
    );

    expect(ranked.map((item) => item.userId)).toEqual(["r1", "r2"]);
    expect(ranked[0]?.combinedScore).toBeGreaterThan(ranked[1]?.combinedScore ?? 0);
  });
});

describe("MockEmbeddingProvider", () => {
  it("returns deterministic vectors for the same text", async () => {
    const provider = new MockEmbeddingProvider();
    const first = await provider.embed("machine learning in education");
    const second = await provider.embed("machine learning in education");

    expect(first).toHaveLength(64);
    expect(second).toEqual(first);
  });
});
