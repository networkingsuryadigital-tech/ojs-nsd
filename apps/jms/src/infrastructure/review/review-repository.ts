import "server-only";

import type { ReviewRecommendation } from "@/domain/review/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function findReviewerInJournal(
  journalId: string,
  reviewerId: string,
): Promise<{
  id: string;
  email: string;
  name: string | null;
  affiliation: string | null;
} | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const membership = await adminDb.journalMembership.findFirst({
    where: {
      journalId,
      userId: reviewerId,
      roles: { has: "REVIEWER" },
    },
    select: {
      user: {
        select: { id: true, email: true, name: true, affiliation: true },
      },
    },
  });
  return membership?.user ?? null;
}

export async function listAssignmentLabels(
  journalId: string,
  submissionId: string,
): Promise<string[]> {
  const assignments = await withTenant(journalId, (tx) =>
    tx.reviewAssignment.findMany({
      where: { submissionId },
      select: { anonymousLabel: true },
    }),
  );
  return assignments
    .map((assignment) => assignment.anonymousLabel)
    .filter((label): label is string => Boolean(label));
}

export async function findActiveAssignmentForReviewer(
  journalId: string,
  submissionId: string,
  reviewerId: string,
  round: number,
): Promise<{ id: string; status: string } | null> {
  return withTenant(journalId, (tx) =>
    tx.reviewAssignment.findFirst({
      where: {
        submissionId,
        reviewerId,
        round,
        status: { in: ["INVITED", "ACCEPTED"] },
      },
      select: { id: true, status: true },
    }),
  );
}

export async function findAssignmentByReviewerRound(
  journalId: string,
  submissionId: string,
  reviewerId: string,
  round: number,
): Promise<{ id: string } | null> {
  return withTenant(journalId, (tx) =>
    tx.reviewAssignment.findFirst({
      where: { submissionId, reviewerId, round },
      select: { id: true },
    }),
  );
}

export async function createReviewAssignment(
  journalId: string,
  data: {
    submissionId: string;
    reviewerId: string;
    round: number;
    anonymousLabel: string;
    dueAt?: Date;
  },
): Promise<{ id: string; anonymousLabel: string }> {
  return withTenant(journalId, async (tx) => {
    const assignment = await tx.reviewAssignment.create({
      data: {
        submissionId: data.submissionId,
        reviewerId: data.reviewerId,
        round: data.round,
        anonymousLabel: data.anonymousLabel,
        dueAt: data.dueAt,
        status: "INVITED",
      },
      select: { id: true, anonymousLabel: true },
    });
    return {
      id: assignment.id,
      anonymousLabel: assignment.anonymousLabel ?? data.anonymousLabel,
    };
  });
}

export async function updateReviewAssignmentStatus(
  journalId: string,
  assignmentId: string,
  status: "ACCEPTED" | "DECLINED" | "SUBMITTED" | "CANCELLED",
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        status,
        respondedAt: status === "ACCEPTED" || status === "DECLINED" ? new Date() : undefined,
        ...(status === "SUBMITTED" ? {} : {}),
      },
    }),
  );
}

export async function createSubmittedReview(
  journalId: string,
  data: {
    assignmentId: string;
    submissionId: string;
    reviewerId: string;
    recommendation: ReviewRecommendation;
    commentsToAuthor?: string;
    commentsToEditor?: string;
    scoreOriginality?: number;
    scoreClarity?: number;
    scoreContribution?: number;
  },
): Promise<{ id: string }> {
  return withTenant(journalId, async (tx) => {
    const review = await tx.review.create({
      data: {
        assignmentId: data.assignmentId,
        submissionId: data.submissionId,
        reviewerId: data.reviewerId,
        recommendation: data.recommendation,
        commentsToAuthor: data.commentsToAuthor,
        commentsToEditor: data.commentsToEditor,
        scoreOriginality: data.scoreOriginality,
        scoreClarity: data.scoreClarity,
        scoreContribution: data.scoreContribution,
        submittedAt: new Date(),
      },
      select: { id: true },
    });

    await tx.reviewAssignment.update({
      where: { id: data.assignmentId },
      data: { status: "SUBMITTED" },
    });

    return review;
  });
}

export async function listSubmissionAuthorsForCoi(
  journalId: string,
  submissionId: string,
): Promise<
  Array<{
    fullName: string;
    email: string | null;
    affiliation: string | null;
  }>
> {
  return withTenant(journalId, (tx) =>
    tx.submissionAuthor.findMany({
      where: { submissionId },
      select: { fullName: true, email: true, affiliation: true },
    }),
  );
}

export async function listAuthorParticipantUserIds(
  journalId: string,
  submissionId: string,
): Promise<string[]> {
  const participants = await withTenant(journalId, (tx) =>
    tx.submissionParticipant.findMany({
      where: {
        submissionId,
        role: { in: ["AUTHOR", "CORRESPONDING_AUTHOR"] },
      },
      select: { userId: true },
    }),
  );
  return participants.map((participant) => participant.userId);
}
