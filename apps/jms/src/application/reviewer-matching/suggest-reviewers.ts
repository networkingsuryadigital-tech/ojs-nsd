import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { buildReviewerCoiWarnings } from "@/application/review/build-reviewer-coi-warnings";
import {
  buildSubmissionEmbeddingText,
  shouldRefreshEmbedding,
} from "@/domain/reviewer-matching/embedding";
import { resolveEmbeddingModelId } from "@/infrastructure/ai/resolve-embedding-model-id";
import { rankReviewerCandidates } from "@/domain/reviewer-matching/rank";
import {
  REVIEWER_SUGGESTION_TOP_N,
  type RankedReviewerSuggestion,
} from "@/domain/reviewer-matching/types";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { resolveEmbeddingProvider } from "@/infrastructure/ai/resolve-embedding-provider";
import {
  listReviewerCandidatesForMatching,
  loadSubmissionMatchContext,
} from "@/infrastructure/ai/reviewer-matching-repository";

const suggestReviewersSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  topN: z.number().int().min(1).max(20).optional(),
});

export type ReviewerSuggestionView = RankedReviewerSuggestion & {
  name: string | null;
  email: string;
  affiliation: string | null;
  keywords: string[];
};

export type SuggestReviewersResult = {
  provider: string;
  suggestions: ReviewerSuggestionView[];
};

export async function suggestReviewers(
  input: z.infer<typeof suggestReviewersSchema>,
): Promise<SuggestReviewersResult> {
  const parsed = suggestReviewersSchema.parse(input);

  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(parsed.journalId, parsed.submissionId, parsed.actorId),
    resolveJournalRoles(parsed.journalId, parsed.actorId),
  ]);

  const actorIsEditor =
    submissionRoles.includes("HANDLING_EDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("SECTION_EDITOR");

  if (!actorIsEditor) {
    throw new SubmissionAuthorizationError();
  }

  const [matchContext, candidates] = await Promise.all([
    loadSubmissionMatchContext(parsed.journalId, parsed.submissionId),
    listReviewerCandidatesForMatching(parsed.journalId, parsed.submissionId),
  ]);

  if (!matchContext) {
    throw new Error("Submission not found.");
  }

  const provider = resolveEmbeddingProvider();
  const modelId = resolveEmbeddingModelId();
  const submissionText = buildSubmissionEmbeddingText(matchContext);
  const submissionEmbedding = await provider.embed(submissionText);

  const enrichedCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const embeddingStale = shouldRefreshEmbedding(
        candidate.keywords,
        {
          embedding: candidate.embedding,
          embeddingModel: candidate.embeddingModel,
          embeddingSourceHash: candidate.embeddingSourceHash,
        },
        modelId,
      );

      const coiWarnings = await buildReviewerCoiWarnings({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        reviewer: {
          userId: candidate.userId,
          email: candidate.email,
          name: candidate.name,
          affiliation: candidate.affiliation,
        },
      });

      return {
        userId: candidate.userId,
        keywords: candidate.keywords,
        maxLoad: candidate.maxLoad,
        activeLoad: candidate.activeLoad,
        embedding: candidate.embedding,
        embeddingStale,
        alreadyAssigned: candidate.alreadyAssigned,
        coiWarnings,
        name: candidate.name,
        email: candidate.email,
        affiliation: candidate.affiliation,
      };
    }),
  );

  const ranked = rankReviewerCandidates(
    matchContext,
    enrichedCandidates,
    submissionEmbedding,
    { topN: parsed.topN ?? REVIEWER_SUGGESTION_TOP_N },
  );

  const candidateById = new Map(
    enrichedCandidates.map((candidate) => [candidate.userId, candidate]),
  );

  const suggestions: ReviewerSuggestionView[] = ranked.map((item) => {
    const candidate = candidateById.get(item.userId);
    return {
      ...item,
      name: candidate?.name ?? null,
      email: candidate?.email ?? "",
      affiliation: candidate?.affiliation ?? null,
      keywords: candidate?.keywords ?? [],
    };
  });

  return {
    provider: provider.name,
    suggestions,
  };
}
