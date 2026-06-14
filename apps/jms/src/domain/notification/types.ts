import type { EditorialDecisionType, TransitionName } from "@/domain/submission/types";

/** Mirrors Prisma `Notification.type` values used by JMS. */
export const NOTIFICATION_TYPES = {
  SUBMISSION_RECEIVED: "SUBMISSION_RECEIVED",
  REVIEW_INVITED: "REVIEW_INVITED",
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",
  REVIEW_OVERDUE: "REVIEW_OVERDUE",
  EDITORIAL_DECISION: "EDITORIAL_DECISION",
  REVISION_RESUBMITTED: "REVISION_RESUBMITTED",
  APC_INVOICE_CREATED: "APC_INVOICE_CREATED",
  APC_WAIVED: "APC_WAIVED",
  PAYMENT_SETTLED: "PAYMENT_SETTLED",
  ARTICLE_PUBLISHED: "ARTICLE_PUBLISHED",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationMessage = {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
};

export type TransitionNotificationInput = {
  transitionName: TransitionName;
  submissionId: string;
  submissionTitle: string;
  journalName: string;
  decision?: EditorialDecisionType;
  note?: string;
  reviewerId?: string;
  dueAt?: Date;
  paymentUrl?: string;
  doi?: string;
};

export const TRANSITIONS_WITH_NOTIFICATIONS: TransitionName[] = [
  "submit",
  "inviteReviewer",
  "submitReview",
  "recordDecision",
  "authorResubmit",
  "createApcInvoice",
  "waiveApc",
  "paymentSettled",
  "publishToIssue",
];
