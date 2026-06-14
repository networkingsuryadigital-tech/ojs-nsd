import "server-only";

import type { EmbeddingProvider } from "@/infrastructure/ai/embedding-provider";
import type { OpenAiCredentials } from "@/infrastructure/ai/credentials";

type OpenAiEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai" as const;

  constructor(private readonly credentials: OpenAiCredentials) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.credentials.model,
        input: text,
      }),
    });

    const payload = (await response.json()) as OpenAiEmbeddingResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? `OpenAI embeddings failed (${response.status}).`,
      );
    }

    const vector = payload.data?.[0]?.embedding;
    if (!vector || vector.length === 0) {
      throw new Error("OpenAI embeddings returned an empty vector.");
    }

    return vector;
  }
}
