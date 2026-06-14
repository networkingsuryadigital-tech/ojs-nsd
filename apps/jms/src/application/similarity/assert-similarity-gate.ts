import "server-only";

import { SimilarityGateBlockedError } from "@/domain/submission/errors";
import type { SimilarityStatus } from "@/domain/similarity/types";
import {
  evaluateSubmissionSimilarityGate,
  loadJournalSimilaritySettings,
} from "@/infrastructure/similarity/journal-similarity-settings";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function assertSimilarityGateAllowed(input: {
  journalId: string;
  submissionId: string;
  acknowledgeHighSimilarity?: boolean;
}): Promise<void> {
  const [settings, submission] = await Promise.all([
    loadJournalSimilaritySettings(input.journalId),
    withTenant(input.journalId, (tx) =>
      tx.submission.findFirst({
        where: { id: input.submissionId, journalId: input.journalId },
        select: {
          similarityStatus: true,
          similarityScore: true,
        },
      }),
    ),
  ]);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const evaluation = evaluateSubmissionSimilarityGate({
    settings,
    status: submission.similarityStatus as SimilarityStatus,
    score: submission.similarityScore,
    acknowledgedHighSimilarity: Boolean(input.acknowledgeHighSimilarity),
  });

  if (evaluation.blocked) {
    throw new SimilarityGateBlockedError(
      evaluation.reason ?? "Similarity gate blocked send to peer review.",
    );
  }
}
