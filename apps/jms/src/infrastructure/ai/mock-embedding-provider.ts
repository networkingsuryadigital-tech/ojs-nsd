import { createHash } from "node:crypto";

import { MOCK_EMBEDDING_DIMENSIONS } from "@/domain/reviewer-matching/embedding";
import type { EmbeddingProvider } from "@/infrastructure/ai/embedding-provider";

/** Deterministic dev/test embeddings when no external API credentials are set. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "mock" as const;

  async embed(text: string): Promise<number[]> {
    const digest = createHash("sha256").update(text).digest();
    const vector: number[] = [];

    for (let index = 0; index < MOCK_EMBEDDING_DIMENSIONS; index += 1) {
      const byte = digest[index % digest.length] ?? 0;
      vector.push((byte / 255) * 2 - 1);
    }

    return vector;
  }
}
