import { SIMILARITY_CHECK_MAX_ATTEMPTS } from "@/domain/similarity/types";

/** Backoff delays for similarity check retries. */
export const SIMILARITY_CHECK_BACKOFF_MS = [
  60_000,
  300_000,
  900_000,
  3_600_000,
  14_400_000,
] as const;

export function computeSimilarityNextRetryAt(
  attemptCount: number,
  now: Date = new Date(),
): Date | null {
  if (attemptCount >= SIMILARITY_CHECK_MAX_ATTEMPTS) {
    return null;
  }
  const delay =
    SIMILARITY_CHECK_BACKOFF_MS[
      Math.min(attemptCount, SIMILARITY_CHECK_BACKOFF_MS.length - 1)
    ] ?? SIMILARITY_CHECK_BACKOFF_MS[SIMILARITY_CHECK_BACKOFF_MS.length - 1]!;
  return new Date(now.getTime() + delay);
}

export function shouldRetrySimilarityCheck(attemptCount: number): boolean {
  return attemptCount < SIMILARITY_CHECK_MAX_ATTEMPTS;
}
