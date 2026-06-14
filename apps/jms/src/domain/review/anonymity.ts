import type { ReviewModel, ViewerContext } from "./types";

export type AuthorIdentityField =
  | "authors"
  | "authorParticipants"
  | "reviewerIdentity"
  | "commentsToEditor"
  | "originalManuscript";

export function isEditorialViewer(ctx: ViewerContext): boolean {
  return (
    ctx.submissionRoles.includes("HANDLING_EDITOR") ||
    ctx.journalRoles.includes("EDITOR_IN_CHIEF") ||
    ctx.journalRoles.includes("SECTION_EDITOR") ||
    ctx.journalRoles.includes("JOURNAL_ADMIN")
  );
}

export function isReviewerViewer(ctx: ViewerContext): boolean {
  return ctx.submissionRoles.includes("REVIEWER");
}

export function isAuthorViewer(ctx: ViewerContext): boolean {
  return (
    ctx.submissionRoles.includes("AUTHOR") ||
    ctx.submissionRoles.includes("CORRESPONDING_AUTHOR")
  );
}

/**
 * Fields that must not appear in a payload for the given viewer + review model.
 */
export function forbiddenFieldsForViewer(
  reviewModel: ReviewModel,
  ctx: ViewerContext,
): AuthorIdentityField[] {
  const forbidden: AuthorIdentityField[] = [];

  if (isAuthorViewer(ctx)) {
    forbidden.push("reviewerIdentity", "commentsToEditor");
  }

  if (isReviewerViewer(ctx) && reviewModel === "DOUBLE_BLIND") {
    forbidden.push("authors", "authorParticipants", "originalManuscript");
  }

  if (isReviewerViewer(ctx) && reviewModel !== "OPEN") {
    // Reviewer never needs other reviewers' identities in blind models.
    forbidden.push("reviewerIdentity");
  }

  return forbidden;
}

export function assertFieldAllowed(
  reviewModel: ReviewModel,
  ctx: ViewerContext,
  field: AuthorIdentityField,
): void {
  const forbidden = forbiddenFieldsForViewer(reviewModel, ctx);
  if (forbidden.includes(field)) {
    throw new Error(`Field "${field}" is not allowed for this viewer.`);
  }
}

export function shouldUseAnonymizedManuscript(
  reviewModel: ReviewModel,
  ctx: ViewerContext,
): boolean {
  if (!isReviewerViewer(ctx)) {
    return false;
  }
  return reviewModel === "DOUBLE_BLIND";
}
