import "server-only";

import { z } from "zod";

import { buildReviewerCoiWarnings } from "@/application/review/build-reviewer-coi-warnings";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import type { CoiWarning } from "@/domain/review/types";
import { findReviewerInJournal } from "@/infrastructure/review/review-repository";

const previewReviewerCoiSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  reviewerId: z.string().trim().min(1),
});

export type PreviewReviewerCoiResult = {
  reviewerId: string;
  reviewerName: string | null;
  coiWarnings: CoiWarning[];
};

export async function previewReviewerCoi(
  input: z.infer<typeof previewReviewerCoiSchema>,
): Promise<PreviewReviewerCoiResult> {
  const parsed = previewReviewerCoiSchema.parse(input);

  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(parsed.journalId, parsed.submissionId, parsed.actorId),
    resolveJournalRoles(parsed.journalId, parsed.actorId),
  ]);

  const actorIsEditor =
    submissionRoles.includes("HANDLING_EDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("SECTION_EDITOR");

  if (!actorIsEditor) {
    throw new SubmissionAuthorizationError("Only editors may preview reviewer COI.");
  }

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

  return {
    reviewerId: reviewer.id,
    reviewerName: reviewer.name,
    coiWarnings,
  };
}
