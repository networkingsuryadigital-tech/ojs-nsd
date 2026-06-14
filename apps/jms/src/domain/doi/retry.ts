import { DOI_DEPOSIT_MAX_ATTEMPTS } from "@/domain/doi/types";

/** Exponential backoff delays for CrossRef deposit retries. */
export const DOI_DEPOSIT_BACKOFF_MS = [
  60_000,
  300_000,
  900_000,
  3_600_000,
  14_400_000,
] as const;

export function computeNextRetryAt(
  attemptCount: number,
  now: Date = new Date(),
): Date | null {
  if (attemptCount >= DOI_DEPOSIT_MAX_ATTEMPTS) {
    return null;
  }
  const delay =
    DOI_DEPOSIT_BACKOFF_MS[
      Math.min(attemptCount, DOI_DEPOSIT_BACKOFF_MS.length - 1)
    ] ?? DOI_DEPOSIT_BACKOFF_MS[DOI_DEPOSIT_BACKOFF_MS.length - 1]!;
  return new Date(now.getTime() + delay);
}

export function shouldRetryDeposit(attemptCount: number): boolean {
  return attemptCount < DOI_DEPOSIT_MAX_ATTEMPTS;
}
