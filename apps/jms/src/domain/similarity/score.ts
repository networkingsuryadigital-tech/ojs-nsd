import { SIMILARITY_HIGH_THRESHOLD } from "@/domain/similarity/types";

export type SimilaritySeverity = "low" | "moderate" | "high";

export function classifySimilarityScore(
  score: number,
  highThreshold = SIMILARITY_HIGH_THRESHOLD,
): SimilaritySeverity {
  if (!Number.isFinite(score) || score < 0) {
    return "low";
  }
  if (score >= highThreshold) {
    return "high";
  }
  if (score >= highThreshold / 2) {
    return "moderate";
  }
  return "low";
}

export function formatSimilarityScore(score: number): string {
  if (!Number.isFinite(score)) {
    return "—";
  }
  return `${Math.round(score * 10) / 10}%`;
}
