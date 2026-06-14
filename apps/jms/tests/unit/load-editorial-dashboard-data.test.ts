import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadEditorialDashboardData } from "@/application/editorial/load-editorial-dashboard-data";
import { getJournalStatistics } from "@/application/statistics/get-journal-statistics";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { reportOperationalFailure } from "@/infrastructure/observability/report-operational-failure";

vi.mock("@/application/statistics/get-journal-statistics", () => ({
  getJournalStatistics: vi.fn(),
}));

vi.mock("@/application/identity/resolve-journal-roles", () => ({
  resolveJournalRoles: vi.fn().mockResolvedValue(["JOURNAL_ADMIN"]),
}));

vi.mock("@/application/reviewer-matching/upsert-reviewer-profile", () => ({
  getReviewerProfileForJournal: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/infrastructure/observability/report-operational-failure", () => ({
  reportOperationalFailure: vi.fn(),
}));

const statsSnapshot = {
  generatedAt: new Date().toISOString(),
  submissions: {
    total: 1,
    byStatus: {},
    pipeline: {
      intake: 0,
      deskReview: 0,
      peerReview: 0,
      accepted: 0,
      production: 0,
      published: 0,
      declined: 0,
    },
    acceptanceRatePercent: null,
    submittedThisMonth: 0,
    publishedThisMonth: 0,
    monthlyTrend: [],
  },
  reviews: {
    assignments: {
      invited: 0,
      accepted: 0,
      submitted: 0,
      declined: 0,
      cancelled: 0,
      overdue: 0,
    },
    medianTurnaroundDays: null,
  },
  publishing: {
    totalIssues: 0,
    publishedIssues: 0,
    draftIssues: 0,
  },
  membership: {
    activeMembers: 0,
    authors: 0,
    reviewers: 0,
    editors: 0,
  },
  billing: null,
} as unknown as Awaited<ReturnType<typeof getJournalStatistics>>;

describe("loadEditorialDashboardData", () => {
  beforeEach(() => {
    vi.mocked(getJournalStatistics).mockResolvedValue(statsSnapshot);
  });

  it("returns auth_error for unauthorized actors", async () => {
    vi.mocked(getJournalStatistics).mockRejectedValue(
      new SubmissionAuthorizationError("forbidden"),
    );

    const result = await loadEditorialDashboardData({
      journalId: "journal-1",
      actorId: "actor-1",
    });

    expect(result).toEqual({ kind: "auth_error" });
  });

  it("returns stats_error instead of masking query failures", async () => {
    vi.mocked(getJournalStatistics).mockRejectedValue(
      new Error("transaction timeout"),
    );

    const result = await loadEditorialDashboardData({
      journalId: "journal-1",
      actorId: "actor-1",
    });

    expect(result).toEqual({
      kind: "stats_error",
      message: "transaction timeout",
    });
    expect(reportOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "editorial-dashboard",
        operation: "getJournalStatistics",
      }),
    );
  });

  it("returns dashboard data on success", async () => {
    const result = await loadEditorialDashboardData({
      journalId: "journal-1",
      actorId: "actor-1",
    });

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.stats).toEqual(statsSnapshot);
      expect(result.reviewerRoles).toContain("JOURNAL_ADMIN");
    }
  });
});
