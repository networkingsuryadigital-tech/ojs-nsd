import { describe, expect, it } from "vitest";

import {
  buildInvoiceStatusSummary,
  buildMonthlyTrend,
  buildSubmissionStatusCounts,
  computeAcceptanceRatePercent,
  computeEditorialPipeline,
  computeMedianDays,
  sumStatusCounts,
} from "@/domain/statistics/aggregates";
import { getStatisticsHealth } from "@/application/statistics/get-statistics-health";

describe("statistics domain", () => {
  describe("buildSubmissionStatusCounts", () => {
    it("fills missing statuses with zero", () => {
      const counts = buildSubmissionStatusCounts([
        { status: "SUBMITTED", count: 3 },
        { status: "PUBLISHED", count: 2 },
      ]);
      expect(counts.SUBMITTED).toBe(3);
      expect(counts.PUBLISHED).toBe(2);
      expect(counts.DRAFT).toBe(0);
    });
  });

  describe("computeEditorialPipeline", () => {
    it("groups workflow stages", () => {
      const counts = buildSubmissionStatusCounts([
        { status: "DRAFT", count: 1 },
        { status: "SUBMITTED", count: 2 },
        { status: "UNDER_REVIEW", count: 4 },
        { status: "REVISIONS_REQUESTED", count: 1 },
        { status: "ACCEPTED", count: 1 },
        { status: "PAYMENT_PENDING", count: 1 },
        { status: "IN_PRODUCTION", count: 2 },
        { status: "PUBLISHED", count: 5 },
        { status: "REJECTED", count: 3 },
      ]);

      const pipeline = computeEditorialPipeline(counts);
      expect(pipeline.intake).toBe(3);
      expect(pipeline.peerReview).toBe(5);
      expect(pipeline.accepted).toBe(2);
      expect(pipeline.production).toBe(2);
      expect(pipeline.published).toBe(5);
      expect(pipeline.declined).toBe(3);
    });
  });

  describe("computeAcceptanceRatePercent", () => {
    it("computes accepted over decided submissions", () => {
      const counts = buildSubmissionStatusCounts([
        { status: "ACCEPTED", count: 7 },
        { status: "IN_PRODUCTION", count: 2 },
        { status: "PUBLISHED", count: 1 },
        { status: "REJECTED", count: 4 },
        { status: "DESK_REJECTED", count: 1 },
      ]);
      expect(computeAcceptanceRatePercent(counts)).toBe(66.7);
    });

    it("returns null when no decisions", () => {
      const counts = buildSubmissionStatusCounts([
        { status: "DRAFT", count: 2 },
      ]);
      expect(computeAcceptanceRatePercent(counts)).toBeNull();
    });
  });

  describe("computeMedianDays", () => {
    it("returns median for odd count", () => {
      expect(computeMedianDays([10, 3, 7])).toBe(7);
    });

    it("returns average of middle pair for even count", () => {
      expect(computeMedianDays([10, 2, 6, 4])).toBe(5);
    });

    it("returns null for empty input", () => {
      expect(computeMedianDays([])).toBeNull();
    });
  });

  describe("buildMonthlyTrend", () => {
    it("fills missing months with zero", () => {
      const trend = buildMonthlyTrend(
        [{ month: "2026-04", count: 2 }],
        3,
        new Date("2026-06-15"),
      );
      expect(trend).toHaveLength(3);
      expect(trend[0]).toEqual({ month: "2026-04", count: 2 });
      expect(trend[1]).toEqual({ month: "2026-05", count: 0 });
      expect(trend[2]).toEqual({ month: "2026-06", count: 0 });
    });
  });

  describe("buildInvoiceStatusSummary", () => {
    it("aggregates paid and outstanding amounts", () => {
      const summary = buildInvoiceStatusSummary(
        [
          { status: "PAID", count: 2, totalAmount: 3_000_000 },
          { status: "ISSUED", count: 1, totalAmount: 1_500_000 },
        ],
        2_550_000,
        "IDR",
      );
      expect(summary.paidRevenue).toBe(3_000_000);
      expect(summary.outstandingAmount).toBe(1_500_000);
      expect(summary.ledgerBalance).toBe(2_550_000);
      expect(summary.invoiceByStatus.PAID.count).toBe(2);
    });
  });

  describe("sumStatusCounts", () => {
    it("sums all submission statuses", () => {
      const counts = buildSubmissionStatusCounts([
        { status: "DRAFT", count: 1 },
        { status: "PUBLISHED", count: 4 },
      ]);
      expect(sumStatusCounts(counts)).toBe(5);
    });
  });
});

describe("getStatisticsHealth", () => {
  it("exposes dashboard feature flags", () => {
    const health = getStatisticsHealth();
    expect(health.ok).toBe(true);
    expect(health.dashboardSections).toContain("billing");
    expect(health.features.editorialDashboardUi).toBe(true);
    expect(health.features.billingSummaryForAdmin).toBe(true);
  });
});
