import { normalizeKeyword } from "./keywords";

/** Expected vector length for mock embeddings (dev/CI). */
export const MOCK_EMBEDDING_DIMENSIONS = 64;

export type StoredEmbeddingMeta = {
  embedding: number[] | null;
  embeddingModel: string | null;
  embeddingSourceHash: string | null;
};

/**
 * FNV-1a fingerprint of normalized, sorted keywords (domain-pure, no crypto I/O).
 */
export function embeddingSourceFingerprint(keywords: readonly string[]): string {
  const payload = keywords
    .map(normalizeKeyword)
    .filter((keyword) => keyword.length > 0)
    .sort()
    .join("\0");

  if (payload.length === 0) {
    return "";
  }

  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** True when keywords are non-empty and stored embedding is missing or out of date. */
export function shouldRefreshEmbedding(
  keywords: readonly string[],
  stored: StoredEmbeddingMeta,
  currentModelId: string,
): boolean {
  const fingerprint = embeddingSourceFingerprint(keywords);
  if (fingerprint.length === 0) {
    return false;
  }

  if (!stored.embedding || stored.embedding.length === 0) {
    return true;
  }

  if (stored.embeddingModel !== currentModelId) {
    return true;
  }

  if (stored.embeddingSourceHash !== fingerprint) {
    return true;
  }

  return false;
}

export function parseEmbeddingVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const vector: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      return null;
    }
    vector.push(item);
  }

  return vector;
}

/**
 * Cosine similarity mapped to 0–1 (assumes non-negative semantic vectors).
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

export function buildSubmissionEmbeddingText(input: {
  title: string;
  abstract: string;
  keywords: readonly string[];
}): string {
  const keywordLine = input.keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(", ");

  return [input.title.trim(), input.abstract.trim(), keywordLine]
    .filter((part) => part.length > 0)
    .join("\n");
}
