import { beforeEach, describe, expect, it, vi } from "vitest";

import { getJournalStatistics } from "@/application/statistics/get-journal-statistics";
import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { loadJournalStatisticsRawData } from "@/infrastructure/statistics/journal-stats-repository";

vi.mock("@/infrastructure/db/with-tenant", () => ({
  withTenant: vi.fn(),
}));

vi.mock("@/application/identity/assert-journal-roles", () => ({
  assertJournalRoles: vi.fn(),
}));

vi.mock("@/application/identity/resolve-journal-roles", () => ({
  resolveJournalRoles: vi.fn(),
}));

vi.mock("@/infrastructure/statistics/journal-stats-repository", () => ({
  loadJournalStatisticsRawData: vi.fn(),
}));

const rawSnapshot = {
  statusRows: [{ status: "SUBMITTED" as const, count: 2 }],
  reviewCounts: {
    invited: 0,
    accepted: 0,
    submitted: 0,
    declined: 0,
    cancelled: 0,
    overdue: 0,
  },
  turnaroundDays: [3],
  issueCounts: { total: 1, published: 1, draft: 0 },
  membershipCounts: {
    activeMembers: 4,
    authors: 2,
    reviewers: 1,
    editors: 1,
  },
  submittedThisMonth: 1,
  publishedThisMonth: 0,
  monthlyRows: [{ month: "2026-06", count: 1 }],
  invoiceRows: [],
  currency: "IDR",
  ledgerBalance: 0,
};

describe("getJournalStatistics", () => {
  beforeEach(() => {
    vi.mocked(assertJournalRoles).mockResolvedValue(["JOURNAL_ADMIN"]);
    vi.mocked(resolveJournalRoles).mockResolvedValue(["JOURNAL_ADMIN"]);
    vi.mocked(withTenant).mockImplementation(async (_journalId, fn) =>
      fn({} as never),
    );
    vi.mocked(loadJournalStatisticsRawData).mockResolvedValue(rawSnapshot);
  });

  it("loads all dashboard reads inside one withTenant transaction", async () => {
    await getJournalStatistics({
      journalId: "journal-1",
      actorId: "actor-1",
    });

    expect(withTenant).toHaveBeenCalledTimes(1);
    expect(loadJournalStatisticsRawData).toHaveBeenCalledTimes(1);
  });

  it("aggregates raw snapshot into dashboard metrics", async () => {
    const snapshot = await getJournalStatistics({
      journalId: "journal-1",
      actorId: "actor-1",
    });

    expect(snapshot.submissions.total).toBe(2);
    expect(snapshot.submissions.byStatus.SUBMITTED).toBe(2);
    expect(snapshot.membership.activeMembers).toBe(4);
    expect(snapshot.billing?.currency).toBe("IDR");
  });
});
