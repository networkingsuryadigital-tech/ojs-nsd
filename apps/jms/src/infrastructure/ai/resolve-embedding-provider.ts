import "server-only";

import { MockEmbeddingProvider } from "@/infrastructure/ai/mock-embedding-provider";
import { OpenAiEmbeddingProvider } from "@/infrastructure/ai/openai-embedding-provider";
import { resolveOpenAiCredentials } from "@/infrastructure/ai/credentials";
import type { EmbeddingProvider } from "@/infrastructure/ai/embedding-provider";

export function getActiveEmbeddingProviderName(): "mock" | "openai" {
  if (resolveOpenAiCredentials()) {
    return "openai";
  }
  return "mock";
}

export function resolveEmbeddingProvider(): EmbeddingProvider {
  const credentials = resolveOpenAiCredentials();
  if (credentials) {
    return new OpenAiEmbeddingProvider(credentials);
  }
  return new MockEmbeddingProvider();
}
