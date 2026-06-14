/** CrossRef DOI deposit — pure types (no I/O). */

export const DOI_DEPOSIT_JOB_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "REGISTERED",
  "FAILED",
] as const;

export type DoiDepositJobStatus = (typeof DOI_DEPOSIT_JOB_STATUSES)[number];

export const DOI_DEPOSIT_KINDS = ["INITIAL", "RETRACTION", "CORRECTION"] as const;

export type DoiDepositKind = (typeof DOI_DEPOSIT_KINDS)[number];

export const DOI_STATUSES = ["NONE", "PENDING", "REGISTERED", "FAILED"] as const;

export type DoiStatus = (typeof DOI_STATUSES)[number];

export const CROSSREF_SCHEMA_VERSION = "5.4.0";

export const DOI_DEPOSIT_MAX_ATTEMPTS = 5;
