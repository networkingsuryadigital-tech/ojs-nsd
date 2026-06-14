import type { InvoiceStatus } from "@/domain/billing/types";
import type { SubmissionStatus } from "@/domain/submission/types";

export type StatusCountRow = {
  status: SubmissionStatus;
  count: number;
};

export type InvoiceStatusCountRow = {
  status: InvoiceStatus;
  count: number;
  totalAmount: number;
};

export type MonthlyCountRow = {
  month: string;
  count: number;
};

export type SubmissionStatusCounts = Record<SubmissionStatus, number>;

export type EditorialPipelineCounts = {
  intake: number;
  deskReview: number;
  peerReview: number;
  accepted: number;
  production: number;
  published: number;
  declined: number;
};

export type ReviewAssignmentCounts = {
  invited: number;
  accepted: number;
  submitted: number;
  declined: number;
  cancelled: number;
  overdue: number;
};

export type PublishingCounts = {
  totalIssues: number;
  publishedIssues: number;
  draftIssues: number;
};

export type BillingSnapshot = {
  invoiceByStatus: Record<InvoiceStatus, { count: number; totalAmount: number }>;
  paidRevenue: number;
  outstandingAmount: number;
  ledgerBalance: number;
  currency: string;
};

export type JournalStatisticsSnapshot = {
  generatedAt: string;
  submissions: {
    total: number;
    byStatus: SubmissionStatusCounts;
    pipeline: EditorialPipelineCounts;
    acceptanceRatePercent: number | null;
    submittedThisMonth: number;
    publishedThisMonth: number;
    monthlyTrend: MonthlyCountRow[];
  };
  reviews: {
    assignments: ReviewAssignmentCounts;
    medianTurnaroundDays: number | null;
  };
  publishing: PublishingCounts;
  membership: {
    activeMembers: number;
    authors: number;
    reviewers: number;
    editors: number;
  };
  billing: BillingSnapshot | null;
};
