import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { buildSubmissionViewForViewer } from "@/application/review/build-submission-view";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import type { ReviewModel } from "@/domain/review/types";
import {
  findReviewerAssignmentForSubmission,
  listReviewerAssignmentsFromDb,
} from "@/infrastructure/review/reviewer-assignment-repository";
import { loadJournalReviewModel } from "@/infrastructure/submission/submission-repository";

const journalActorSchema = z.object({
  journalId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

async function assertReviewerJournalAccess(
  journalId: string,
  actorUserId: string,
): Promise<void> {
  const roles = await resolveJournalRoles(journalId, actorUserId);
  if (!roles.includes("REVIEWER")) {
    throw new SubmissionAuthorizationError(
      "Only reviewers may access the reviewer dashboard.",
    );
  }
}

export async function listReviewerAssignments(
  input: z.infer<typeof journalActorSchema>,
) {
  const parsed = journalActorSchema.parse(input);
  await assertReviewerJournalAccess(parsed.journalId, parsed.actorUserId);
  return listReviewerAssignmentsFromDb(parsed.journalId, parsed.actorUserId);
}

const submissionActorSchema = journalActorSchema.extend({
  submissionId: z.string().trim().min(1),
});

export type ReviewerSubmissionDetail = {
  assignment: {
    assignmentId: string;
    status: string;
    round: number;
  };
  reviewModel: ReviewModel;
  view: Awaited<ReturnType<typeof buildSubmissionViewForViewer>>;
};

export async function getReviewerSubmissionDetail(
  input: z.infer<typeof submissionActorSchema>,
): Promise<ReviewerSubmissionDetail> {
  const parsed = submissionActorSchema.parse(input);
  await assertReviewerJournalAccess(parsed.journalId, parsed.actorUserId);

  const assignment = await findReviewerAssignmentForSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );
  if (!assignment) {
    throw new SubmissionAuthorizationError();
  }

  const submissionRoles = await resolveSubmissionRoles(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );
  const journalRoles = await resolveJournalRoles(
    parsed.journalId,
    parsed.actorUserId,
  );
  const reviewModel = await loadJournalReviewModel(parsed.journalId);

  const view = await buildSubmissionViewForViewer(
    parsed.journalId,
    parsed.submissionId,
    reviewModel,
    { reviewModel, submissionRoles, journalRoles },
  );
  if (!view) {
    throw new Error("Submission not found.");
  }

  return {
    assignment: {
      assignmentId: assignment.assignmentId,
      status: assignment.status,
      round: assignment.round,
    },
    reviewModel,
    view,
  };
}
