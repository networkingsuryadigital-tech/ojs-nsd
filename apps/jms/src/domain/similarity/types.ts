/** Similarity check — pure types (no I/O). */

export const SIMILARITY_STATUSES = [
  "NOT_RUN",
  "PENDING",
  "COMPLETED",
  "FAILED",
] as const;

export type SimilarityStatus = (typeof SIMILARITY_STATUSES)[number];

export const SIMILARITY_CHECK_JOB_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "COMPLETED",
  "FAILED",
] as const;

export type SimilarityCheckJobStatus =
  (typeof SIMILARITY_CHECK_JOB_STATUSES)[number];

export const SIMILARITY_PROVIDERS = ["mock", "copyleaks", "ithenticate"] as const;

export type SimilarityProviderName = (typeof SIMILARITY_PROVIDERS)[number];

export const SIMILARITY_GATE_POLICIES = ["OFF", "WARN", "BLOCK"] as const;

export type SimilarityGatePolicy = (typeof SIMILARITY_GATE_POLICIES)[number];

/** Default threshold (%) above which editors should scrutinize before peer review. */
export const SIMILARITY_HIGH_THRESHOLD = 25;

export const SIMILARITY_CHECK_MAX_ATTEMPTS = 5;
