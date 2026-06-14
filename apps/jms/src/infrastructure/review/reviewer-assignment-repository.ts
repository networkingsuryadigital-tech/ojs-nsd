import "server-only";

import type { ReviewAssignmentStatus } from "@/domain/review/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type ReviewerAssignmentRow = {
  assignmentId: string;
  submissionId: string;
  status: ReviewAssignmentStatus;
  round: number;
  title: string | null;
  dueAt: Date | null;
  anonymousLabel: string | null;
};

export async function listReviewerAssignmentsFromDb(
  journalId: string,
  reviewerId: string,
): Promise<ReviewerAssignmentRow[]> {
  const assignments = await withTenant(journalId, (tx) =>
    tx.reviewAssignment.findMany({
      where: {
        reviewerId,
        status: { in: ["INVITED", "ACCEPTED", "SUBMITTED"] },
        submission: { journalId },
      },
      orderBy: { invitedAt: "desc" },
      select: {
        id: true,
        status: true,
        round: true,
        dueAt: true,
        anonymousLabel: true,
        submission: {
          select: {
            id: true,
            translations: {
              where: { isPrimary: true },
              select: { title: true },
              take: 1,
            },
          },
        },
      },
    }),
  );

  return assignments.map((assignment) => ({
    assignmentId: assignment.id,
    submissionId: assignment.submission.id,
    status: assignment.status,
    round: assignment.round,
    title: assignment.submission.translations[0]?.title ?? null,
    dueAt: assignment.dueAt,
    anonymousLabel: assignment.anonymousLabel,
  }));
}

export async function findReviewerAssignmentForSubmission(
  journalId: string,
  submissionId: string,
  reviewerId: string,
): Promise<{
  assignmentId: string;
  status: ReviewAssignmentStatus;
  round: number;
} | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: { reviewRound: true },
    });
    if (!submission) {
      return null;
    }

    const assignment = await tx.reviewAssignment.findFirst({
      where: {
        submissionId,
        reviewerId,
        round: submission.reviewRound,
        status: { in: ["INVITED", "ACCEPTED", "SUBMITTED"] },
      },
      select: { id: true, status: true, round: true },
    });

    if (!assignment) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      status: assignment.status,
      round: assignment.round,
    };
  });
}
