import { describe, expect, it } from "vitest";

import {
  computeDiscountedAmount,
  formatDiscountNote,
} from "@/domain/billing/discount";
import { sumLedgerBalance } from "@/domain/billing/ledger";
import { buildApcOrderId, parseApcOrderId } from "@/domain/billing/order-id";
import { computeJournalShare } from "@/domain/billing/revenue-split";
import { isMidtransPaymentSettled, isPaymentSettled } from "@/domain/billing/settlement";
import { getBillingHealth } from "@/application/billing/get-billing-health";

describe("billing domain", () => {
  describe("buildApcOrderId", () => {
    it("prefixes invoice id", () => {
      expect(buildApcOrderId("inv_abc123")).toBe("apc-inv_abc123");
    });
  });

  describe("parseApcOrderId", () => {
    it("extracts invoice id from order id", () => {
      expect(parseApcOrderId("apc-inv_abc123")).toBe("inv_abc123");
    });

    it("rejects unknown prefix", () => {
      expect(parseApcOrderId("order-123")).toBeNull();
    });
  });

  describe("isMidtransPaymentSettled", () => {
    it("accepts settlement", () => {
      expect(
        isMidtransPaymentSettled({ transactionStatus: "settlement" }),
      ).toBe(true);
    });

    it("rejects capture with fraud challenge", () => {
      expect(
        isMidtransPaymentSettled({
          transactionStatus: "capture",
          fraudStatus: "challenge",
        }),
      ).toBe(false);
    });

    it("rejects pending", () => {
      expect(isMidtransPaymentSettled({ transactionStatus: "pending" })).toBe(
        false,
      );
    });
  });

  describe("isPaymentSettled", () => {
    it("delegates to Midtrans rules", () => {
      expect(isPaymentSettled("MIDTRANS", "settlement")).toBe(true);
      expect(isPaymentSettled("XENDIT", "settlement")).toBe(false);
    });
  });

  describe("computeDiscountedAmount", () => {
    it("applies fixed discount", () => {
      expect(
        computeDiscountedAmount(1_000_000, { discountAmount: 200_000 }),
      ).toBe(800_000);
    });

    it("applies percent discount", () => {
      expect(
        computeDiscountedAmount(1_000_000, { discountPercent: 50 }),
      ).toBe(500_000);
    });

    it("rejects discount exceeding amount", () => {
      expect(() =>
        computeDiscountedAmount(100_000, { discountAmount: 150_000 }),
      ).toThrow();
    });
  });

  describe("formatDiscountNote", () => {
    it("includes amount and note", () => {
      const note = formatDiscountNote(
        "Beasiswa",
        { discountPercent: 100 },
        500_000,
        0,
      );
      expect(note).toContain("Diskon 100%");
      expect(note).toContain("Beasiswa");
    });
  });

  describe("computeJournalShare", () => {
    it("splits revenue by basis points", () => {
      const split = computeJournalShare(1_000_000, 8500);
      expect(split.journalShare).toBe(850_000);
      expect(split.platformFee).toBe(150_000);
    });
  });

  describe("sumLedgerBalance", () => {
    it("sums signed ledger entries", () => {
      expect(
        sumLedgerBalance([
          { amount: 850_000 },
          { amount: -300_000 },
          { amount: 200_000 },
        ]),
      ).toBe(750_000);
    });
  });

  describe("getBillingHealth", () => {
    it("exposes APC billing features", () => {
      const health = getBillingHealth();
      expect(health.ok).toBe(true);
      expect(health.orderIdPrefix).toBe("apc-");
      expect(health.features.apcInvoiceOnAccept).toBe(true);
      expect(health.features.midtransWebhook).toBe(true);
      expect(health.features.apcDiscount).toBe(true);
      expect(health.features.apcWaiver).toBe(true);
      expect(health.features.journalLedger).toBe(true);
      expect(health.features.journalPayout).toBe(true);
      expect(health.defaultRevenueShareBps).toBe(8500);
    });
  });
});
