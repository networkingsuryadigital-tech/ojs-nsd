import "server-only";

import { parseEmbeddingVector } from "@/domain/reviewer-matching/embedding";
import { REVIEWER_ACTIVE_LOAD_STATUSES } from "@/domain/reviewer-matching/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

const DEFAULT_MAX_LOAD = 3;

export type ReviewerCandidateRecord = {
  userId: string;
  email: string;
  name: string | null;
  affiliation: string | null;
  keywords: string[];
  maxLoad: number;
  activeLoad: number;
  embedding: number[] | null;
  embeddingModel: string | null;
  embeddingSourceHash: string | null;
  alreadyAssigned: boolean;
};

export async function loadSubmissionMatchContext(
  journalId: string,
  submissionId: string,
): Promise<{
  title: string;
  abstract: string;
  keywords: string[];
} | null> {
  const submission = await withTenant(journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        translations: {
          where: { isPrimary: true },
          select: { title: true, abstract: true, keywords: true },
          take: 1,
        },
      },
    }),
  );

  const primary = submission?.translations[0];
  if (!primary) {
    return null;
  }

  return {
    title: primary.title,
    abstract: primary.abstract,
    keywords: primary.keywords,
  };
}

export async function listReviewerCandidatesForMatching(
  journalId: string,
  submissionId: string,
): Promise<ReviewerCandidateRecord[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const [memberships, assignedReviewerIds] = await Promise.all([
    adminDb.journalMembership.findMany({
      where: {
        journalId,
        roles: { has: "REVIEWER" },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            affiliation: true,
            reviewerProfile: {
              select: {
                keywords: true,
                maxLoad: true,
                embedding: true,
                embeddingModel: true,
                embeddingSourceHash: true,
              },
            },
            reviewAssignments: {
              where: {
                status: { in: [...REVIEWER_ACTIVE_LOAD_STATUSES] },
                submission: { journalId },
              },
              select: { id: true },
            },
          },
        },
      },
    }),
    withTenant(journalId, (tx) =>
      tx.reviewAssignment.findMany({
        where: {
          submissionId,
          status: { in: ["INVITED", "ACCEPTED", "SUBMITTED"] },
        },
        select: { reviewerId: true },
      }),
    ),
  ]);

  const assignedSet = new Set(
    assignedReviewerIds.map((assignment) => assignment.reviewerId),
  );

  return memberships.map((membership) => {
    const user = membership.user;
    const profile = user.reviewerProfile;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      affiliation: user.affiliation,
      keywords: profile?.keywords ?? [],
      maxLoad: profile?.maxLoad ?? DEFAULT_MAX_LOAD,
      activeLoad: user.reviewAssignments.length,
      embedding: parseEmbeddingVector(profile?.embedding ?? null),
      embeddingModel: profile?.embeddingModel ?? null,
      embeddingSourceHash: profile?.embeddingSourceHash ?? null,
      alreadyAssigned: assignedSet.has(user.id),
    };
  });
}
