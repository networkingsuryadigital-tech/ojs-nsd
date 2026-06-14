import { INVOICE_STATUSES } from "@/domain/billing/types";
import { SUBMISSION_STATUSES } from "@/domain/submission/types";

import type {
  BillingSnapshot,
  EditorialPipelineCounts,
  InvoiceStatusCountRow,
  MonthlyCountRow,
  ReviewAssignmentCounts,
  StatusCountRow,
  SubmissionStatusCounts,
} from "./types";

export function buildSubmissionStatusCounts(
  rows: StatusCountRow[],
): SubmissionStatusCounts {
  const counts = Object.fromEntries(
    SUBMISSION_STATUSES.map((status) => [status, 0]),
  ) as SubmissionStatusCounts;

  for (const row of rows) {
    if (SUBMISSION_STATUSES.includes(row.status)) {
      counts[row.status] = row.count;
    }
  }

  return counts;
}

export function sumStatusCounts(counts: SubmissionStatusCounts): number {
  return SUBMISSION_STATUSES.reduce((sum, status) => sum + counts[status], 0);
}

export function computeEditorialPipeline(
  counts: SubmissionStatusCounts,
): EditorialPipelineCounts {
  return {
    intake: counts.DRAFT + counts.SUBMITTED,
    deskReview: counts.DESK_REVIEW,
    peerReview:
      counts.UNDER_REVIEW + counts.REVISIONS_REQUESTED + counts.RESUBMITTED,
    accepted: counts.ACCEPTED + counts.PAYMENT_PENDING,
    production: counts.IN_PRODUCTION,
    published: counts.PUBLISHED,
    declined: counts.DESK_REJECTED + counts.REJECTED + counts.WITHDRAWN,
  };
}

export function computeAcceptanceRatePercent(
  counts: SubmissionStatusCounts,
): number | null {
  const accepted = counts.ACCEPTED + counts.PAYMENT_PENDING + counts.IN_PRODUCTION + counts.PUBLISHED;
  const declined = counts.DESK_REJECTED + counts.REJECTED;
  const decided = accepted + declined;
  if (decided === 0) {
    return null;
  }
  return Math.round((accepted / decided) * 1000) / 10;
}

export function computeMedianDays(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return sorted[mid]!;
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

export function buildReviewAssignmentCounts(input: {
  invited: number;
  accepted: number;
  submitted: number;
  declined: number;
  cancelled: number;
  overdue: number;
}): ReviewAssignmentCounts {
  return { ...input };
}

export function buildMonthlyTrend(
  rows: MonthlyCountRow[],
  months: number,
  referenceDate: Date = new Date(),
): MonthlyCountRow[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.count]));
  const trend: MonthlyCountRow[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - offset,
      1,
    );
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    trend.push({ month, count: byMonth.get(month) ?? 0 });
  }

  return trend;
}

export function buildInvoiceStatusSummary(
  rows: InvoiceStatusCountRow[],
  ledgerBalance: number,
  currency: string,
): BillingSnapshot {
  const invoiceByStatus = Object.fromEntries(
    INVOICE_STATUSES.map((status) => [
      status,
      { count: 0, totalAmount: 0 },
    ]),
  ) as BillingSnapshot["invoiceByStatus"];

  let paidRevenue = 0;
  let outstandingAmount = 0;

  for (const row of rows) {
    if (!INVOICE_STATUSES.includes(row.status)) {
      continue;
    }
    invoiceByStatus[row.status] = {
      count: row.count,
      totalAmount: row.totalAmount,
    };
    if (row.status === "PAID") {
      paidRevenue += row.totalAmount;
    }
    if (row.status === "ISSUED") {
      outstandingAmount += row.totalAmount;
    }
  }

  return {
    invoiceByStatus,
    paidRevenue,
    outstandingAmount,
    ledgerBalance,
    currency,
  };
}
