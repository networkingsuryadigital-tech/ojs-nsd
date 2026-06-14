export type EmbeddingProviderName = "mock" | "openai";

export type EmbeddingProvider = {
  readonly name: EmbeddingProviderName;
  embed(text: string): Promise<number[]>;
};
