import "server-only";

import { z } from "zod";

import { buildReviewerCoiWarnings } from "@/application/review/build-reviewer-coi-warnings";
import type { CoiWarning } from "@/domain/review/types";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { findReviewerInJournal } from "@/infrastructure/review/review-repository";

const inviteReviewerSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  reviewerId: z.string().trim().min(1),
  dueAt: z.string().datetime().optional(),
});

export type InviteReviewerResult = {
  fromStatus: string;
  toStatus: string;
  eventType: string;
  coiWarnings: CoiWarning[];
};

export async function inviteReviewer(
  input: z.infer<typeof inviteReviewerSchema>,
): Promise<InviteReviewerResult> {
  const parsed = inviteReviewerSchema.parse(input);

  const reviewer = await findReviewerInJournal(parsed.journalId, parsed.reviewerId);
  if (!reviewer) {
    throw new Error("Reviewer not found in this journal.");
  }

  const coiWarnings = await buildReviewerCoiWarnings({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    reviewer: {
      userId: reviewer.id,
      email: reviewer.email,
      name: reviewer.name,
      affiliation: reviewer.affiliation,
    },
  });

  const result = await transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "inviteReviewer",
    payload: {
      reviewerId: parsed.reviewerId,
      dueAt: parsed.dueAt,
      coiWarnings,
    },
  });

  return { ...result, coiWarnings };
}
