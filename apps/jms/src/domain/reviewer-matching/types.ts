import type { CoiWarning } from "@/domain/review/types";

/** Default number of reviewer suggestions shown to editors. */
export const REVIEWER_SUGGESTION_TOP_N = 5;

/** Weight for keyword overlap when embedding score is available. */
export const REVIEWER_KEYWORD_WEIGHT = 0.4;

/** Weight for semantic embedding similarity. */
export const REVIEWER_EMBEDDING_WEIGHT = 0.6;

/** Active assignments that count toward reviewer load. */
export const REVIEWER_ACTIVE_LOAD_STATUSES = ["INVITED", "ACCEPTED"] as const;

/** Max reviewer profiles refreshed per cron run. */
export const REVIEWER_EMBEDDING_BATCH_LIMIT = 50;

/** Model id stored when using MockEmbeddingProvider. */
export const MOCK_EMBEDDING_MODEL_ID = "mock-embedding-v1";

export type ReviewerMatchInput = {
  keywords: string[];
  abstract: string;
  title: string;
};

export type ReviewerCandidateInput = {
  userId: string;
  keywords: string[];
  maxLoad: number;
  activeLoad: number;
  embedding: number[] | null;
  embeddingStale: boolean;
  alreadyAssigned: boolean;
  coiWarnings: CoiWarning[];
};

export type RankedReviewerSuggestion = {
  userId: string;
  keywordScore: number;
  embeddingScore: number | null;
  combinedScore: number;
  activeLoad: number;
  maxLoad: number;
  coiWarnings: CoiWarning[];
  embeddingStale: boolean;
};
