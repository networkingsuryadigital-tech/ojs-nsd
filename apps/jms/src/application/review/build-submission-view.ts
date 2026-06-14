import "server-only";

import {
  assertFieldAllowed,
  shouldUseAnonymizedManuscript,
} from "@/domain/review/anonymity";
import type { ReviewModel, ViewerContext } from "@/domain/review/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type SubmissionView = {
  submissionId: string;
  status: string;
  reviewRound: number;
  title: string | null;
  abstract: string | null;
  authors: Array<{
    fullName: string;
    affiliation: string | null;
    orcid: string | null;
  }> | null;
  manuscriptFileId: string | null;
  reviews: Array<{
    anonymousLabel: string;
    recommendation: string | null;
    commentsToAuthor: string | null;
    submittedAt: Date | null;
  }>;
  assignments: Array<{
    anonymousLabel: string | null;
    status: string;
    dueAt: Date | null;
  }> | null;
};

export async function buildSubmissionViewForViewer(
  journalId: string,
  submissionId: string,
  reviewModel: ReviewModel,
  viewer: ViewerContext,
): Promise<SubmissionView | null> {
  const submission = await withTenant(journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        id: true,
        status: true,
        reviewRound: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true, abstract: true },
          take: 1,
        },
        authors: {
          select: { fullName: true, affiliation: true, orcid: true },
          orderBy: { order: "asc" },
        },
        files: {
          select: { id: true, type: true, round: true, createdAt: true },
        },
        reviewAssignments: {
          select: {
            anonymousLabel: true,
            status: true,
            dueAt: true,
            review: {
              select: {
                recommendation: true,
                commentsToAuthor: true,
                submittedAt: true,
              },
            },
          },
        },
      },
    }),
  );

  if (!submission) return null;

  const includeAuthors = (() => {
    try {
      assertFieldAllowed(reviewModel, viewer, "authors");
      return true;
    } catch {
      return false;
    }
  })();

  const includeAssignments = (() => {
    try {
      assertFieldAllowed(reviewModel, viewer, "reviewerIdentity");
      return true;
    } catch {
      return false;
    }
  })();

  const primary = submission.translations[0];
  const useAnonymized = shouldUseAnonymizedManuscript(reviewModel, viewer);
  const manuscript = submission.files
    .filter(
      (file) =>
        file.round === submission.reviewRound &&
        file.type === (useAnonymized ? "ANONYMIZED_MANUSCRIPT" : "MANUSCRIPT"),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    submissionId: submission.id,
    status: submission.status,
    reviewRound: submission.reviewRound,
    title: primary?.title ?? null,
    abstract: primary?.abstract ?? null,
    authors: includeAuthors
      ? submission.authors.map((author) => ({
          fullName: author.fullName,
          affiliation: author.affiliation,
          orcid: author.orcid,
        }))
      : null,
    manuscriptFileId: manuscript?.id ?? null,
    reviews: submission.reviewAssignments.map((assignment) => ({
      anonymousLabel: assignment.anonymousLabel ?? "Reviewer",
      recommendation: assignment.review?.recommendation ?? null,
      commentsToAuthor: assignment.review?.commentsToAuthor ?? null,
      submittedAt: assignment.review?.submittedAt ?? null,
    })),
    assignments: includeAssignments
      ? submission.reviewAssignments.map((assignment) => ({
          anonymousLabel: assignment.anonymousLabel,
          status: assignment.status,
          dueAt: assignment.dueAt,
        }))
      : null,
  };
}
