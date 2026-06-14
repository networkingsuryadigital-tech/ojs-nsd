import "server-only";

import { env } from "@/lib/env";

export type OpenAiCredentials = {
  apiKey: string;
  model: string;
};

export function resolveOpenAiCredentials(): OpenAiCredentials | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  };
}
