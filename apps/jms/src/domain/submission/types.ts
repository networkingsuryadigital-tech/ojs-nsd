/** Mirrors Prisma `SubmissionStatus` without importing Prisma in domain. */
export const SUBMISSION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "DESK_REVIEW",
  "DESK_REJECTED",
  "UNDER_REVIEW",
  "REVISIONS_REQUESTED",
  "RESUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "PAYMENT_PENDING",
  "IN_PRODUCTION",
  "PUBLISHED",
  "RETRACTED",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Mirrors Prisma `SubmissionRoleType`. */
export const SUBMISSION_ROLES = [
  "AUTHOR",
  "CORRESPONDING_AUTHOR",
  "HANDLING_EDITOR",
  "REVIEWER",
  "COPYEDITOR",
] as const;

export type SubmissionRole = (typeof SUBMISSION_ROLES)[number];

/** Mirrors Prisma `JournalRole` — used for journal-scoped transitions. */
export const JOURNAL_ROLES = [
  "JOURNAL_ADMIN",
  "EDITOR_IN_CHIEF",
  "SECTION_EDITOR",
  "REVIEWER",
  "AUTHOR",
  "COPYEDITOR",
  "READER",
] as const;

export type JournalRole = (typeof JOURNAL_ROLES)[number];

/** Transition names per `03-editorial-workflow.md` §3. */
export const TRANSITION_NAMES = [
  "submit",
  "assignToEditor",
  "deskReject",
  "sendToReview",
  "inviteReviewer",
  "submitReview",
  "recordDecision",
  "authorResubmit",
  "createApcInvoice",
  "paymentSettled",
  "waiveApc",
  "uploadGalley",
  "publishToIssue",
  "withdraw",
  "retractPublication",
  "recordPublicationCorrection",
] as const;

export type TransitionName = (typeof TRANSITION_NAMES)[number];

/** Mirrors Prisma `ReviewRecommendation` for `recordDecision`. */
export const EDITORIAL_DECISION_TYPES = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
] as const;

export type EditorialDecisionType = (typeof EDITORIAL_DECISION_TYPES)[number];

export type TransitionCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Mirrors Prisma `ReviewRecommendation` for peer review submission. */
export const REVIEW_RECOMMENDATIONS = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
  "SEE_COMMENTS",
] as const;

export type ReviewRecommendation = (typeof REVIEW_RECOMMENDATIONS)[number];

export type SubmissionTransitionContext = {
  status: SubmissionStatus;
  submissionRoles: SubmissionRole[];
  journalRoles: JournalRole[];
  isSystemActor: boolean;
  hasManuscript: boolean;
  hasPrimaryTranslation: boolean;
  hasRevisionFile: boolean;
  reviewRound: number;
  apcAmount: number;
  hasInvoice: boolean;
  invoiceStatus: string | null;
  hasActiveReviewAssignment: boolean;
  reviewerId?: string;
  reviewerAlreadyAssigned?: boolean;
  reviewRecommendation?: ReviewRecommendation;
  issueId: string | null;
  hasGalley: boolean;
  hasRegisteredDoi: boolean;
  decision?: EditorialDecisionType;
};

export const TERMINAL_STATUSES: SubmissionStatus[] = [
  "DESK_REJECTED",
  "REJECTED",
  "PUBLISHED",
  "RETRACTED",
  "WITHDRAWN",
];

export const WITHDRAWABLE_STATUSES: SubmissionStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "DESK_REVIEW",
  "UNDER_REVIEW",
  "REVISIONS_REQUESTED",
  "RESUBMITTED",
  "ACCEPTED",
  "PAYMENT_PENDING",
  "IN_PRODUCTION",
];

export type AuthorInput = {
  fullName: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
  order: number;
  isCorresponding: boolean;
};

export type TranslationInput = {
  language: string;
  title: string;
  abstract: string;
  keywords: string[];
};

export type CreateDraftSubmissionInput = {
  journalId: string;
  actorUserId: string;
  sectionId?: string;
  primaryLanguage?: string;
  authors: AuthorInput[];
  translation: TranslationInput;
};

export type CreateDraftSubmissionResult = {
  submissionId: string;
  authorIds: string[];
  translationId: string;
};

export type UploadManuscriptInput = {
  journalId: string;
  submissionId: string;
  actorUserId: string;
  file: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type UploadManuscriptResult = {
  fileId: string;
  storageKey: string;
};

export type TransitionSubmissionInput = {
  journalId: string;
  submissionId: string;
  actorId?: string;
  isSystemActor?: boolean;
  name: TransitionName;
  payload?: Record<string, unknown>;
};

export type SubmitSubmissionInput = {
  journalId: string;
  submissionId: string;
  actorId: string;
};
