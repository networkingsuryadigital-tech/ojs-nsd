import "server-only";

import { MOCK_EMBEDDING_MODEL_ID } from "@/domain/reviewer-matching/types";
import { resolveOpenAiCredentials } from "@/infrastructure/ai/credentials";

export function resolveEmbeddingModelId(): string {
  const credentials = resolveOpenAiCredentials();
  return credentials?.model ?? MOCK_EMBEDDING_MODEL_ID;
}
