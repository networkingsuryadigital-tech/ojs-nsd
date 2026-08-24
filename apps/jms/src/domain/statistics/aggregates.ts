import { INVOICE_STATUSES } from "@/domain/billing/types";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "@/domain/submission/types";

import type {
  BillingSnapshot,
  EditorialPipelineCounts,
  EditorialPipelineKey,
  InvoiceStatusCountRow,
  MonthlyCountRow,
  ReviewAssignmentCounts,
  StatusCountRow,
  SubmissionStatusCounts,
} from "./types";
import { EDITORIAL_PIPELINE_KEYS } from "./types";

export const EDITORIAL_PIPELINE_STATUSES: Record<
  EditorialPipelineKey,
  readonly SubmissionStatus[]
> = {
  intake: ["DRAFT", "SUBMITTED"],
  deskReview: ["DESK_REVIEW"],
  peerReview: ["UNDER_REVIEW", "REVISIONS_REQUESTED", "RESUBMITTED"],
  accepted: ["ACCEPTED", "PAYMENT_PENDING"],
  production: ["IN_PRODUCTION"],
  published: ["PUBLISHED"],
  declined: ["DESK_REJECTED", "REJECTED", "WITHDRAWN"],
};

export function isEditorialPipelineKey(
  value: string,
): value is EditorialPipelineKey {
  return (EDITORIAL_PIPELINE_KEYS as readonly string[]).includes(value);
}

export function statusesForEditorialPipeline(
  key: EditorialPipelineKey,
): readonly SubmissionStatus[] {
  return EDITORIAL_PIPELINE_STATUSES[key];
}

export function pipelineKeyForStatus(
  status: SubmissionStatus,
): EditorialPipelineKey | undefined {
  return EDITORIAL_PIPELINE_KEYS.find((key) =>
    EDITORIAL_PIPELINE_STATUSES[key].includes(status),
  );
}

export function resolveEditorialQueueStatuses(input: {
  status?: string | null;
  pipeline?: string | null;
}): readonly SubmissionStatus[] | undefined {
  if (
    input.status &&
    (SUBMISSION_STATUSES as readonly string[]).includes(input.status)
  ) {
    return [input.status as SubmissionStatus];
  }
  if (input.pipeline && isEditorialPipelineKey(input.pipeline)) {
    return EDITORIAL_PIPELINE_STATUSES[input.pipeline];
  }
  return undefined;
}

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
  return Object.fromEntries(
    EDITORIAL_PIPELINE_KEYS.map((key) => [
      key,
      EDITORIAL_PIPELINE_STATUSES[key].reduce(
        (sum, status) => sum + counts[status],
        0,
      ),
    ]),
  ) as EditorialPipelineCounts;
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
