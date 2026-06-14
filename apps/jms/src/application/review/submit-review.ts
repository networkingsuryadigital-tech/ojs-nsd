import "server-only";

import { z } from "zod";

import { REVIEW_RECOMMENDATIONS } from "@/domain/review/types";
import { transitionSubmission } from "@/application/submission/transition-submission";

const submitReviewSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  recommendation: z.enum(REVIEW_RECOMMENDATIONS),
  commentsToAuthor: z.string().max(20_000).optional(),
  commentsToEditor: z.string().max(20_000).optional(),
  scoreOriginality: z.number().int().min(1).max(5).optional(),
  scoreClarity: z.number().int().min(1).max(5).optional(),
  scoreContribution: z.number().int().min(1).max(5).optional(),
});

export async function submitReview(
  input: z.infer<typeof submitReviewSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = submitReviewSchema.parse(input);

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "submitReview",
    payload: {
      recommendation: parsed.recommendation,
      commentsToAuthor: parsed.commentsToAuthor,
      commentsToEditor: parsed.commentsToEditor,
      scoreOriginality: parsed.scoreOriginality,
      scoreClarity: parsed.scoreClarity,
      scoreContribution: parsed.scoreContribution,
    },
  });
}
