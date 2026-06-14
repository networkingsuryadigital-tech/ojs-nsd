import "server-only";

import { getJournalStatistics } from "@/application/statistics/get-journal-statistics";
import { getReviewerProfileForJournal } from "@/application/reviewer-matching/upsert-reviewer-profile";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import type { JournalStatisticsSnapshot } from "@/domain/statistics/types";
import { reportOperationalFailure } from "@/infrastructure/observability/report-operational-failure";

export type EditorialDashboardData =
  | {
      kind: "success";
      stats: JournalStatisticsSnapshot;
      reviewerRoles: string[];
      reviewerProfile: Awaited<ReturnType<typeof getReviewerProfileForJournal>>;
    }
  | { kind: "auth_error" }
  | { kind: "stats_error"; message: string };

export async function loadEditorialDashboardData(input: {
  journalId: string;
  actorId: string;
}): Promise<EditorialDashboardData> {
  let stats: JournalStatisticsSnapshot;
  try {
    stats = await getJournalStatistics({
      journalId: input.journalId,
      actorId: input.actorId,
    });
  } catch (error) {
    if (error instanceof SubmissionAuthorizationError) {
      return { kind: "auth_error" };
    }
    await reportOperationalFailure({
      scope: "editorial-dashboard",
      operation: "getJournalStatistics",
      journalId: input.journalId,
      actorId: input.actorId,
      error,
    });
    return {
      kind: "stats_error",
      message:
        error instanceof Error
          ? error.message
          : "Gagal memuat statistik dashboard.",
    };
  }

  let reviewerRoles: string[] = [];
  let reviewerProfile: Awaited<ReturnType<typeof getReviewerProfileForJournal>> =
    null;

  try {
    reviewerRoles = await resolveJournalRoles(input.journalId, input.actorId);
    if (
      reviewerRoles.includes("REVIEWER") ||
      reviewerRoles.includes("JOURNAL_ADMIN")
    ) {
      reviewerProfile = await getReviewerProfileForJournal({
        journalId: input.journalId,
        actorId: input.actorId,
      });
    }
  } catch (error) {
    await reportOperationalFailure({
      scope: "editorial-dashboard",
      operation: "loadReviewerProfile",
      journalId: input.journalId,
      actorId: input.actorId,
      error,
    });
  }

  return {
    kind: "success",
    stats,
    reviewerRoles,
    reviewerProfile,
  };
}
