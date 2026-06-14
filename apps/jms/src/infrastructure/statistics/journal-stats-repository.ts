import "server-only";

import type { InvoiceStatus, Prisma, SubmissionStatus } from "@prisma/client";

import { sumLedgerBalance } from "@/domain/billing/ledger";
import { withTenant } from "@/infrastructure/db/with-tenant";

type TenantTx = Prisma.TransactionClient;

export type RawStatusCount = {
  status: SubmissionStatus;
  count: number;
};

export type RawInvoiceStatusCount = {
  status: InvoiceStatus;
  count: number;
  totalAmount: number;
};

export type RawMonthlySubmissionCount = {
  month: string;
  count: number;
};

export type JournalStatisticsRawData = {
  statusRows: RawStatusCount[];
  reviewCounts: Awaited<ReturnType<typeof countReviewAssignmentsWithTx>>;
  turnaroundDays: number[];
  issueCounts: { total: number; published: number; draft: number };
  membershipCounts: Awaited<ReturnType<typeof countMembershipRolesWithTx>>;
  submittedThisMonth: number;
  publishedThisMonth: number;
  monthlyRows: RawMonthlySubmissionCount[];
  invoiceRows: RawInvoiceStatusCount[];
  currency: string;
  ledgerBalance: number;
};

async function countSubmissionsByStatusWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<RawStatusCount[]> {
  const rows = await tx.submission.groupBy({
    by: ["status"],
    where: { journalId },
    _count: { _all: true },
  });

  return rows.map((row) => ({
    status: row.status,
    count: row._count._all,
  }));
}

async function countSubmissionsCreatedSinceWithTx(
  tx: TenantTx,
  journalId: string,
  since: Date,
): Promise<number> {
  return tx.submission.count({
    where: { journalId, createdAt: { gte: since } },
  });
}

async function countSubmissionsPublishedSinceWithTx(
  tx: TenantTx,
  journalId: string,
  since: Date,
): Promise<number> {
  return tx.submission.count({
    where: { journalId, status: "PUBLISHED", publishedAt: { gte: since } },
  });
}

async function countSubmissionsByMonthWithTx(
  tx: TenantTx,
  journalId: string,
  monthsBack: number,
): Promise<RawMonthlySubmissionCount[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const submissions = await tx.submission.findMany({
    where: { journalId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const byMonth = new Map<string, number>();
  for (const submission of submissions) {
    const date = submission.createdAt;
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }

  return [...byMonth.entries()].map(([month, count]) => ({ month, count }));
}

async function countReviewAssignmentsWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<{
  invited: number;
  accepted: number;
  submitted: number;
  declined: number;
  cancelled: number;
  overdue: number;
}> {
  const rows = await tx.reviewAssignment.groupBy({
    by: ["status"],
    where: { submission: { journalId } },
    _count: { _all: true },
  });

  const counts = {
    invited: 0,
    accepted: 0,
    submitted: 0,
    declined: 0,
    cancelled: 0,
    overdue: 0,
  };

  for (const row of rows) {
    switch (row.status) {
      case "INVITED":
        counts.invited = row._count._all;
        break;
      case "ACCEPTED":
        counts.accepted = row._count._all;
        break;
      case "SUBMITTED":
        counts.submitted = row._count._all;
        break;
      case "DECLINED":
        counts.declined = row._count._all;
        break;
      case "CANCELLED":
        counts.cancelled = row._count._all;
        break;
      case "OVERDUE":
        counts.overdue = row._count._all;
        break;
      default:
        break;
    }
  }

  return counts;
}

async function loadReviewTurnaroundDaysWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<number[]> {
  const assignments = await tx.reviewAssignment.findMany({
    where: {
      submission: { journalId },
      status: "SUBMITTED",
      review: { submittedAt: { not: null } },
    },
    select: {
      invitedAt: true,
      review: { select: { submittedAt: true } },
    },
  });

  return assignments
    .filter((row) => row.review?.submittedAt)
    .map((row) => {
      const submittedAt = row.review!.submittedAt!;
      const ms = submittedAt.getTime() - row.invitedAt.getTime();
      return Math.max(0, ms / (1000 * 60 * 60 * 24));
    });
}

async function countIssuesWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<{ total: number; published: number; draft: number }> {
  const total = await tx.issue.count({ where: { journalId } });
  const published = await tx.issue.count({
    where: { journalId, isPublished: true },
  });
  return { total, published, draft: total - published };
}

async function countInvoicesByStatusWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<RawInvoiceStatusCount[]> {
  const rows = await tx.apcInvoice.groupBy({
    by: ["status"],
    where: { journalId },
    _count: { _all: true },
    _sum: { amount: true },
  });

  return rows.map((row) => ({
    status: row.status,
    count: row._count._all,
    totalAmount: row._sum.amount ?? 0,
  }));
}

async function loadJournalCurrencyWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<string> {
  const journal = await tx.journal.findFirst({
    where: { id: journalId },
    select: { apcCurrency: true },
  });
  return journal?.apcCurrency ?? "IDR";
}

async function countMembershipRolesWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<{
  activeMembers: number;
  authors: number;
  reviewers: number;
  editors: number;
}> {
  const memberships = await tx.journalMembership.findMany({
    where: { journalId, isActive: true },
    select: { roles: true },
  });

  let authors = 0;
  let reviewers = 0;
  let editors = 0;

  for (const membership of memberships) {
    if (membership.roles.includes("AUTHOR")) {
      authors += 1;
    }
    if (membership.roles.includes("REVIEWER")) {
      reviewers += 1;
    }
    if (
      membership.roles.some((role) =>
        ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"].includes(role),
      )
    ) {
      editors += 1;
    }
  }

  return {
    activeMembers: memberships.length,
    authors,
    reviewers,
    editors,
  };
}

async function sumLedgerBalanceWithTx(
  tx: TenantTx,
  journalId: string,
): Promise<number> {
  const entries = await tx.journalLedgerEntry.findMany({
    where: { journalId },
    select: { amount: true },
  });
  return sumLedgerBalance(entries);
}

/**
 * Loads all dashboard statistics reads inside an existing tenant transaction.
 * Callers must open exactly one `withTenant` per dashboard render.
 */
export async function loadJournalStatisticsRawData(
  tx: TenantTx,
  journalId: string,
  input: {
    monthStart: Date;
    trendMonths: number;
    includeBilling: boolean;
  },
): Promise<JournalStatisticsRawData> {
  const [
    statusRows,
    reviewCounts,
    turnaroundDays,
    issueCounts,
    membershipCounts,
    submittedThisMonth,
    publishedThisMonth,
    monthlyRows,
    invoiceRows,
    currency,
    ledgerBalance,
  ] = await Promise.all([
    countSubmissionsByStatusWithTx(tx, journalId),
    countReviewAssignmentsWithTx(tx, journalId),
    loadReviewTurnaroundDaysWithTx(tx, journalId),
    countIssuesWithTx(tx, journalId),
    countMembershipRolesWithTx(tx, journalId),
    countSubmissionsCreatedSinceWithTx(tx, journalId, input.monthStart),
    countSubmissionsPublishedSinceWithTx(tx, journalId, input.monthStart),
    countSubmissionsByMonthWithTx(tx, journalId, input.trendMonths),
    input.includeBilling
      ? countInvoicesByStatusWithTx(tx, journalId)
      : Promise.resolve([]),
    input.includeBilling
      ? loadJournalCurrencyWithTx(tx, journalId)
      : Promise.resolve("IDR"),
    input.includeBilling
      ? sumLedgerBalanceWithTx(tx, journalId)
      : Promise.resolve(0),
  ]);

  return {
    statusRows,
    reviewCounts,
    turnaroundDays,
    issueCounts,
    membershipCounts,
    submittedThisMonth,
    publishedThisMonth,
    monthlyRows,
    invoiceRows,
    currency,
    ledgerBalance,
  };
}

export async function countSubmissionsByStatus(
  journalId: string,
): Promise<RawStatusCount[]> {
  return withTenant(journalId, (tx) =>
    countSubmissionsByStatusWithTx(tx, journalId),
  );
}

export async function countSubmissionsCreatedSince(
  journalId: string,
  since: Date,
): Promise<number> {
  return withTenant(journalId, (tx) =>
    countSubmissionsCreatedSinceWithTx(tx, journalId, since),
  );
}

export async function countSubmissionsPublishedSince(
  journalId: string,
  since: Date,
): Promise<number> {
  return withTenant(journalId, (tx) =>
    countSubmissionsPublishedSinceWithTx(tx, journalId, since),
  );
}

export async function countSubmissionsByMonth(
  journalId: string,
  monthsBack: number,
): Promise<RawMonthlySubmissionCount[]> {
  return withTenant(journalId, (tx) =>
    countSubmissionsByMonthWithTx(tx, journalId, monthsBack),
  );
}

export async function countReviewAssignmentsByStatus(
  journalId: string,
): Promise<Awaited<ReturnType<typeof countReviewAssignmentsWithTx>>> {
  return withTenant(journalId, (tx) =>
    countReviewAssignmentsWithTx(tx, journalId),
  );
}

export async function loadReviewTurnaroundDays(
  journalId: string,
): Promise<number[]> {
  return withTenant(journalId, (tx) =>
    loadReviewTurnaroundDaysWithTx(tx, journalId),
  );
}

export async function countIssues(
  journalId: string,
): Promise<{ total: number; published: number; draft: number }> {
  return withTenant(journalId, (tx) => countIssuesWithTx(tx, journalId));
}

export async function countInvoicesByStatus(
  journalId: string,
): Promise<RawInvoiceStatusCount[]> {
  return withTenant(journalId, (tx) =>
    countInvoicesByStatusWithTx(tx, journalId),
  );
}

export async function loadJournalCurrency(journalId: string): Promise<string> {
  return withTenant(journalId, (tx) =>
    loadJournalCurrencyWithTx(tx, journalId),
  );
}

export async function countMembershipRoles(journalId: string): Promise<{
  activeMembers: number;
  authors: number;
  reviewers: number;
  editors: number;
}> {
  return withTenant(journalId, (tx) =>
    countMembershipRolesWithTx(tx, journalId),
  );
}
