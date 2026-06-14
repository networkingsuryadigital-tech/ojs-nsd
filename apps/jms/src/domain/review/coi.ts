import {
  buildPriorCoAuthorWarnings,
  mergeCoiWarnings,
} from "@/domain/review/coi-history";
import type {
  CoiAuthor,
  CoiReviewer,
  CoiWarning,
  PriorCoAuthorPublication,
} from "./types";

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Detects conflict-of-interest signals when inviting a reviewer.
 * Returns warnings only — editor retains final decision.
 */
export function detectCoiWarnings(
  authors: CoiAuthor[],
  reviewer: CoiReviewer,
  authorUserIds: string[],
): CoiWarning[] {
  const warnings: CoiWarning[] = [];

  if (authorUserIds.includes(reviewer.userId)) {
    warnings.push({
      code: "AUTHOR_IS_REVIEWER",
      message: "Reviewer is listed as an author on this submission.",
    });
  }

  const reviewerEmail = normalize(reviewer.email);
  const reviewerAffiliation = normalize(reviewer.affiliation);

  for (const author of authors) {
    if (reviewerEmail && normalize(author.email) === reviewerEmail) {
      warnings.push({
        code: "SAME_EMAIL",
        message: `Reviewer email matches author "${author.fullName}".`,
      });
    }

    if (
      reviewerAffiliation &&
      normalize(author.affiliation) === reviewerAffiliation
    ) {
      warnings.push({
        code: "SAME_AFFILIATION",
        message: `Reviewer shares affiliation with author "${author.fullName}".`,
      });
    }
  }

  return warnings;
}

export function detectCoiWarningsWithHistory(
  authors: CoiAuthor[],
  reviewer: CoiReviewer,
  authorUserIds: string[],
  priorCoAuthorPublications: PriorCoAuthorPublication[] = [],
): CoiWarning[] {
  return mergeCoiWarnings(
    detectCoiWarnings(authors, reviewer, authorUserIds),
    buildPriorCoAuthorWarnings(priorCoAuthorPublications),
  );
}
