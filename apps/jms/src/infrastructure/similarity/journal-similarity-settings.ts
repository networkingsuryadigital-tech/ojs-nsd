import "server-only";

import {
  resolveSimilarityBlockThreshold,
  type SimilarityGateEvaluation,
  evaluateSimilarityGate,
} from "@/domain/similarity/gate";
import type { SimilarityGatePolicy } from "@/domain/similarity/types";
import type { SimilarityStatus } from "@/domain/similarity/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type JournalSimilaritySettings = {
  providerOverride: "MOCK" | "COPYLEAKS" | "ITHENTICATE" | null;
  gatePolicy: SimilarityGatePolicy;
  blockThresholdPercent: number;
};

export type JournalSimilaritySettingsForm = {
  providerOverride: "MOCK" | "COPYLEAKS" | "ITHENTICATE" | null;
  gatePolicy: SimilarityGatePolicy;
  blockThresholdStored: number | null;
  blockThresholdPercent: number;
};

export async function loadJournalSimilaritySettings(
  journalId: string,
): Promise<JournalSimilaritySettings> {
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: journalId },
      select: {
        similarityProvider: true,
        similarityGatePolicy: true,
        similarityBlockThreshold: true,
      },
    }),
  );

  if (!journal) {
    throw new Error("Journal not found.");
  }

  return {
    providerOverride: journal.similarityProvider,
    gatePolicy: journal.similarityGatePolicy as SimilarityGatePolicy,
    blockThresholdPercent: resolveSimilarityBlockThreshold(
      journal.similarityBlockThreshold,
    ),
  };
}

export async function loadJournalSimilaritySettingsForm(
  journalId: string,
): Promise<JournalSimilaritySettingsForm> {
  const settings = await loadJournalSimilaritySettings(journalId);
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: journalId },
      select: { similarityBlockThreshold: true },
    }),
  );

  if (!journal) {
    throw new Error("Journal not found.");
  }

  return {
    providerOverride: settings.providerOverride,
    gatePolicy: settings.gatePolicy,
    blockThresholdStored: journal.similarityBlockThreshold,
    blockThresholdPercent: settings.blockThresholdPercent,
  };
}

export async function saveJournalSimilaritySettings(
  journalId: string,
  input: {
    providerOverride: "MOCK" | "COPYLEAKS" | "ITHENTICATE" | null;
    gatePolicy: SimilarityGatePolicy;
    blockThresholdPercent: number | null;
  },
): Promise<JournalSimilaritySettings> {
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.update({
      where: { id: journalId },
      data: {
        similarityProvider: input.providerOverride,
        similarityGatePolicy: input.gatePolicy,
        similarityBlockThreshold: input.blockThresholdPercent,
      },
      select: {
        similarityProvider: true,
        similarityGatePolicy: true,
        similarityBlockThreshold: true,
      },
    }),
  );

  return {
    providerOverride: journal.similarityProvider,
    gatePolicy: journal.similarityGatePolicy as SimilarityGatePolicy,
    blockThresholdPercent: resolveSimilarityBlockThreshold(
      journal.similarityBlockThreshold,
    ),
  };
}

export function evaluateSubmissionSimilarityGate(input: {
  settings: JournalSimilaritySettings;
  status: SimilarityStatus;
  score: number | null;
  acknowledgedHighSimilarity: boolean;
}): SimilarityGateEvaluation {
  return evaluateSimilarityGate({
    policy: input.settings.gatePolicy,
    thresholdPercent: input.settings.blockThresholdPercent,
    status: input.status,
    score: input.score,
    acknowledgedHighSimilarity: input.acknowledgedHighSimilarity,
  });
}
