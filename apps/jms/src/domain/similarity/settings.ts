import {
  SIMILARITY_GATE_POLICIES,
  type SimilarityGatePolicy,
} from "@/domain/similarity/types";

export const JOURNAL_SIMILARITY_PROVIDER_OPTIONS = [
  "PLATFORM",
  "MOCK",
  "COPYLEAKS",
  "ITHENTICATE",
] as const;

export type JournalSimilarityProviderOption =
  (typeof JOURNAL_SIMILARITY_PROVIDER_OPTIONS)[number];

export class SimilaritySettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimilaritySettingsValidationError";
  }
}

export function providerOptionFromDb(
  value: "MOCK" | "COPYLEAKS" | "ITHENTICATE" | null,
): JournalSimilarityProviderOption {
  if (!value) {
    return "PLATFORM";
  }
  return value;
}

export function parseJournalSimilarityProviderInput(
  raw: string | null | undefined,
): "MOCK" | "COPYLEAKS" | "ITHENTICATE" | null {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value || value === "PLATFORM") {
    return null;
  }
  if (value === "MOCK" || value === "COPYLEAKS" || value === "ITHENTICATE") {
    return value;
  }
  throw new SimilaritySettingsValidationError(
    `Provider similarity tidak valid: ${raw}`,
  );
}

export function parseSimilarityGatePolicyInput(
  raw: string | null | undefined,
): SimilarityGatePolicy {
  const value = String(raw ?? "").trim().toUpperCase();
  if ((SIMILARITY_GATE_POLICIES as readonly string[]).includes(value)) {
    return value as SimilarityGatePolicy;
  }
  throw new SimilaritySettingsValidationError(
    `Kebijakan gate tidak valid: ${raw}`,
  );
}

export function parseSimilarityBlockThresholdInput(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const text = String(raw).trim();
  if (text === "") {
    return null;
  }
  const num = Number(text);
  if (!Number.isFinite(num) || num <= 0 || num > 100) {
    throw new SimilaritySettingsValidationError(
      "Ambang similarity harus antara 1 dan 100, atau kosong untuk default platform.",
    );
  }
  return num;
}
