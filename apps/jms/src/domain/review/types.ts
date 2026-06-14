/** Mirrors Prisma `ReviewModel`. */
export const REVIEW_MODELS = [
  "SINGLE_BLIND",
  "DOUBLE_BLIND",
  "OPEN",
] as const;

export type ReviewModel = (typeof REVIEW_MODELS)[number];

/** Mirrors Prisma `ReviewRecommendation`. */
export const REVIEW_RECOMMENDATIONS = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
  "SEE_COMMENTS",
] as const;

export type ReviewRecommendation = (typeof REVIEW_RECOMMENDATIONS)[number];

/** Mirrors Prisma `ReviewAssignmentStatus`. */
export const REVIEW_ASSIGNMENT_STATUSES = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "SUBMITTED",
  "CANCELLED",
  "OVERDUE",
] as const;

export type ReviewAssignmentStatus =
  (typeof REVIEW_ASSIGNMENT_STATUSES)[number];

export type ViewerContext = {
  reviewModel: ReviewModel;
  submissionRoles: readonly (
    | "AUTHOR"
    | "CORRESPONDING_AUTHOR"
    | "HANDLING_EDITOR"
    | "REVIEWER"
    | "COPYEDITOR"
  )[];
  journalRoles: readonly (
    | "JOURNAL_ADMIN"
    | "EDITOR_IN_CHIEF"
    | "SECTION_EDITOR"
    | "REVIEWER"
    | "AUTHOR"
    | "COPYEDITOR"
    | "READER"
  )[];
};

export type CoiAuthor = {
  fullName: string;
  email?: string | null;
  affiliation?: string | null;
};

export type CoiReviewer = {
  userId: string;
  email: string;
  name?: string | null;
  affiliation?: string | null;
};

export type CoiWarningCode =
  | "SAME_AFFILIATION"
  | "SAME_EMAIL"
  | "AUTHOR_IS_REVIEWER"
  | "PRIOR_CO_AUTHOR";

export type CoiWarning = {
  code: CoiWarningCode;
  message: string;
};

export type PriorCoAuthorPublication = {
  submissionId: string;
  title: string;
  publishedAt: string | null;
};
