import { describe, expect, it } from "vitest";

import {
  isFailedNotificationSideEffect,
  parseFailedNotificationEffect,
  submissionNeedsApcInvoiceReconciliation,
  submissionNeedsDoiDepositReconciliation,
} from "@/domain/submission/side-effect-reconciliation";

describe("side-effect reconciliation predicates", () => {
  it("flags ACCEPTED submissions without invoice", () => {
    expect(
      submissionNeedsApcInvoiceReconciliation({
        status: "ACCEPTED",
        hasInvoice: false,
      }),
    ).toBe(true);
    expect(
      submissionNeedsApcInvoiceReconciliation({
        status: "ACCEPTED",
        hasInvoice: true,
      }),
    ).toBe(false);
    expect(
      submissionNeedsApcInvoiceReconciliation({
        status: "PAYMENT_PENDING",
        hasInvoice: false,
      }),
    ).toBe(false);
  });

  it("flags PUBLISHED submissions with DOI prefix but no deposit job", () => {
    expect(
      submissionNeedsDoiDepositReconciliation({
        status: "PUBLISHED",
        doiPrefix: "10.12345",
        hasDoiDepositJob: false,
      }),
    ).toBe(true);
    expect(
      submissionNeedsDoiDepositReconciliation({
        status: "PUBLISHED",
        doiPrefix: "10.12345",
        hasDoiDepositJob: true,
      }),
    ).toBe(false);
    expect(
      submissionNeedsDoiDepositReconciliation({
        status: "PUBLISHED",
        doiPrefix: null,
        hasDoiDepositJob: false,
      }),
    ).toBe(false);
  });

  it("detects failed notification side effects", () => {
    expect(
      isFailedNotificationSideEffect("emitTransitionNotifications:submit"),
    ).toBe(true);
    expect(isFailedNotificationSideEffect("issueApcInvoice")).toBe(false);
  });

  it("parses failed notification effects for retry", () => {
    expect(parseFailedNotificationEffect("emitTransitionNotifications:submit")).toEqual(
      { transitionName: "submit" },
    );
    expect(
      parseFailedNotificationEffect("emitTransitionNotifications:recordDecisionAccept"),
    ).toEqual({ transitionName: "recordDecision", decision: "ACCEPT" });
    expect(parseFailedNotificationEffect("emitTransitionNotifications:unknown")).toBeNull();
  });
});
