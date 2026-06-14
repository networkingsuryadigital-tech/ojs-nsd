import { computeKeywordOverlapScore } from "./keywords";
import { cosineSimilarity } from "./embedding";
import type {
  RankedReviewerSuggestion,
  ReviewerCandidateInput,
  ReviewerMatchInput,
} from "./types";
import {
  REVIEWER_EMBEDDING_WEIGHT,
  REVIEWER_KEYWORD_WEIGHT,
  REVIEWER_SUGGESTION_TOP_N,
} from "./types";

export function combineMatchScores(
  keywordScore: number,
  embeddingScore: number | null,
): number {
  if (embeddingScore === null) {
    return keywordScore;
  }

  return (
    REVIEWER_KEYWORD_WEIGHT * keywordScore +
    REVIEWER_EMBEDDING_WEIGHT * embeddingScore
  );
}

function hasHardCoiExclusion(warnings: RankedReviewerSuggestion["coiWarnings"]): boolean {
  return warnings.some((warning) => warning.code === "AUTHOR_IS_REVIEWER");
}

export function rankReviewerCandidates(
  submission: ReviewerMatchInput,
  candidates: ReviewerCandidateInput[],
  submissionEmbedding: number[] | null,
  options?: { topN?: number },
): RankedReviewerSuggestion[] {
  const topN = options?.topN ?? REVIEWER_SUGGESTION_TOP_N;

  const ranked = candidates
    .filter((candidate) => !candidate.alreadyAssigned)
    .filter((candidate) => candidate.activeLoad < candidate.maxLoad)
    .filter((candidate) => !hasHardCoiExclusion(candidate.coiWarnings))
    .map((candidate) => {
      const keywordScore = computeKeywordOverlapScore(
        submission.keywords,
        candidate.keywords,
      );

      const embeddingScore =
        submissionEmbedding && candidate.embedding
          ? cosineSimilarity(submissionEmbedding, candidate.embedding)
          : null;

      return {
        userId: candidate.userId,
        keywordScore,
        embeddingScore,
        combinedScore: combineMatchScores(keywordScore, embeddingScore),
        activeLoad: candidate.activeLoad,
        maxLoad: candidate.maxLoad,
        coiWarnings: candidate.coiWarnings,
        embeddingStale: candidate.embeddingStale,
      };
    })
    .sort((left, right) => {
      if (right.combinedScore !== left.combinedScore) {
        return right.combinedScore - left.combinedScore;
      }
      if (left.activeLoad !== right.activeLoad) {
        return left.activeLoad - right.activeLoad;
      }
      return left.userId.localeCompare(right.userId);
    });

  return ranked.slice(0, topN);
}
