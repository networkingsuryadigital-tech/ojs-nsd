import "server-only";

import { z } from "zod";

import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import {
  findActiveAssignmentForReviewer,
  updateReviewAssignmentStatus,
} from "@/infrastructure/review/review-repository";
import { loadSubmission } from "@/infrastructure/submission/submission-repository";

const respondSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  response: z.enum(["ACCEPT", "DECLINE"]),
});

export async function respondReviewInvitation(
  input: z.infer<typeof respondSchema>,
): Promise<{ assignmentId: string; status: "ACCEPTED" | "DECLINED" }> {
  const parsed = respondSchema.parse(input);

  const roles = await resolveSubmissionRoles(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorId,
  );
  if (!roles.includes("REVIEWER")) {
    throw new SubmissionAuthorizationError(
      "Only assigned reviewers may respond to invitations.",
    );
  }

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }

  const assignment = await findActiveAssignmentForReviewer(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorId,
    submission.reviewRound,
  );
  if (!assignment) {
    throw new Error("No pending review invitation found.");
  }

  const status = parsed.response === "ACCEPT" ? "ACCEPTED" : "DECLINED";
  await updateReviewAssignmentStatus(parsed.journalId, assignment.id, status);

  return { assignmentId: assignment.id, status };
}
