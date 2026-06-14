import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import {
  buildInvoiceStatusSummary,
  buildMonthlyTrend,
  buildReviewAssignmentCounts,
  buildSubmissionStatusCounts,
  computeAcceptanceRatePercent,
  computeEditorialPipeline,
  computeMedianDays,
  sumStatusCounts,
} from "@/domain/statistics/aggregates";
import type { JournalStatisticsSnapshot } from "@/domain/statistics/types";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { loadJournalStatisticsRawData } from "@/infrastructure/statistics/journal-stats-repository";

const getJournalStatisticsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  trendMonths: z.number().int().min(3).max(12).optional(),
});

function startOfCurrentMonth(referenceDate: Date = new Date()): Date {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
}

export async function getJournalStatistics(
  input: z.infer<typeof getJournalStatisticsSchema>,
): Promise<JournalStatisticsSnapshot> {
  const parsed = getJournalStatisticsSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"],
    "Only editorial staff may view journal statistics.",
  );

  const roles = await resolveJournalRoles(parsed.journalId, parsed.actorId);
  const includeBilling = roles.includes("JOURNAL_ADMIN");
  const monthStart = startOfCurrentMonth();
  const trendMonths = parsed.trendMonths ?? 6;

  const {
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
  } = await withTenant(parsed.journalId, (tx) =>
    loadJournalStatisticsRawData(tx, parsed.journalId, {
      monthStart,
      trendMonths,
      includeBilling,
    }),
  );

  const byStatus = buildSubmissionStatusCounts(statusRows);

  return {
    generatedAt: new Date().toISOString(),
    submissions: {
      total: sumStatusCounts(byStatus),
      byStatus,
      pipeline: computeEditorialPipeline(byStatus),
      acceptanceRatePercent: computeAcceptanceRatePercent(byStatus),
      submittedThisMonth,
      publishedThisMonth,
      monthlyTrend: buildMonthlyTrend(monthlyRows, trendMonths),
    },
    reviews: {
      assignments: buildReviewAssignmentCounts(reviewCounts),
      medianTurnaroundDays: computeMedianDays(turnaroundDays),
    },
    publishing: {
      totalIssues: issueCounts.total,
      publishedIssues: issueCounts.published,
      draftIssues: issueCounts.draft,
    },
    membership: membershipCounts,
    billing: includeBilling
      ? buildInvoiceStatusSummary(invoiceRows, ledgerBalance, currency)
      : null,
  };
}
