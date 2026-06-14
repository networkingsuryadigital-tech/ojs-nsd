import type { SimilarityGatePolicy } from "@/domain/similarity/types";
import type { SimilarityStatus } from "@/domain/similarity/types";
import { SIMILARITY_HIGH_THRESHOLD } from "@/domain/similarity/types";

export type SimilarityGateEvaluation = {
  blocked: boolean;
  requiresAcknowledgment: boolean;
  warning: string | null;
  reason: string | null;
};

export function resolveSimilarityBlockThreshold(
  journalThreshold: number | null | undefined,
  defaultThreshold = SIMILARITY_HIGH_THRESHOLD,
): number {
  if (
    journalThreshold !== null &&
    journalThreshold !== undefined &&
    Number.isFinite(journalThreshold) &&
    journalThreshold > 0
  ) {
    return journalThreshold;
  }
  return defaultThreshold;
}

export function evaluateSimilarityGate(input: {
  policy: SimilarityGatePolicy;
  thresholdPercent: number;
  status: SimilarityStatus;
  score: number | null;
  acknowledgedHighSimilarity: boolean;
}): SimilarityGateEvaluation {
  if (input.policy === "OFF") {
    return {
      blocked: false,
      requiresAcknowledgment: false,
      warning: null,
      reason: null,
    };
  }

  const threshold = input.thresholdPercent;
  const highScore =
    input.status === "COMPLETED" &&
    input.score !== null &&
    Number.isFinite(input.score) &&
    input.score >= threshold;

  if (input.policy === "BLOCK") {
    if (input.status === "PENDING" || input.status === "NOT_RUN") {
      return {
        blocked: true,
        requiresAcknowledgment: false,
        warning: null,
        reason:
          "Similarity check belum selesai. Tunggu hasil pemeriksaan sebelum mengirim ke peer review.",
      };
    }

    if (input.status === "FAILED") {
      return {
        blocked: true,
        requiresAcknowledgment: false,
        warning: null,
        reason:
          "Similarity check gagal. Perbaiki atau jalankan ulang sebelum mengirim ke peer review.",
      };
    }

    if (highScore) {
      return {
        blocked: true,
        requiresAcknowledgment: false,
        warning: null,
        reason: `Skor similarity ${input.score}% melebihi ambang ${threshold}%. Kirim ke peer review diblokir oleh kebijakan jurnal.`,
      };
    }

    return {
      blocked: false,
      requiresAcknowledgment: false,
      warning: null,
      reason: null,
    };
  }

  // WARN policy
  if (highScore) {
    const warning = `Skor similarity ${input.score}% ≥ ambang peringatan ${threshold}%. Pastikan Anda telah meninjau laporan sebelum melanjutkan.`;
    if (!input.acknowledgedHighSimilarity) {
      return {
        blocked: true,
        requiresAcknowledgment: true,
        warning,
        reason:
          "Konfirmasi bahwa Anda telah meninjau laporan similarity sebelum mengirim ke peer review.",
      };
    }

    return {
      blocked: false,
      requiresAcknowledgment: true,
      warning,
      reason: null,
    };
  }

  return {
    blocked: false,
    requiresAcknowledgment: false,
    warning: null,
    reason: null,
  };
}
