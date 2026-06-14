import { describe, expect, it } from "vitest";

import {
  TRANSITIONS,
  canTransition,
  resolveTransitionTarget,
} from "@/domain/submission/state-machine";
import { TRANSITION_NAMES } from "@/domain/submission/types";
import type { SubmissionTransitionContext } from "@/domain/submission/types";

function baseCtx(
  overrides: Partial<SubmissionTransitionContext> = {},
): SubmissionTransitionContext {
  return {
    status: "DRAFT",
    submissionRoles: ["AUTHOR"],
    journalRoles: [],
    isSystemActor: false,
    hasManuscript: true,
    hasPrimaryTranslation: true,
    hasRevisionFile: false,
    reviewRound: 0,
    apcAmount: 0,
    hasInvoice: false,
    invoiceStatus: null,
    hasActiveReviewAssignment: false,
    issueId: null,
    hasGalley: false,
    hasRegisteredDoi: false,
    ...overrides,
  };
}

describe("submission state machine", () => {
  it("defines all Sprint 6 transitions from §03", () => {
    expect(TRANSITION_NAMES).toHaveLength(16);
    for (const name of TRANSITION_NAMES) {
      expect(TRANSITIONS[name]).toBeDefined();
      expect(TRANSITIONS[name].eventType.length).toBeGreaterThan(0);
    }
  });

  describe("submit", () => {
    it("allows submit from DRAFT for AUTHOR with manuscript and translation", () => {
      expect(canTransition("submit", baseCtx())).toEqual({ ok: true });
    });

    it("rejects submit without manuscript", () => {
      const result = canTransition("submit", baseCtx({ hasManuscript: false }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/manuscript/i);
    });

    it("rejects submit from SUBMITTED", () => {
      expect(canTransition("submit", baseCtx({ status: "SUBMITTED" })).ok).toBe(
        false,
      );
    });
  });

  describe("assignToEditor", () => {
    it("allows SECTION_EDITOR from SUBMITTED", () => {
      const result = canTransition(
        "assignToEditor",
        baseCtx({
          status: "SUBMITTED",
          submissionRoles: [],
          journalRoles: ["SECTION_EDITOR"],
        }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("rejects author role", () => {
      expect(
        canTransition(
          "assignToEditor",
          baseCtx({ status: "SUBMITTED", submissionRoles: ["AUTHOR"] }),
        ).ok,
      ).toBe(false);
    });
  });

  describe("deskReject", () => {
    it("allows HANDLING_EDITOR from DESK_REVIEW", () => {
      expect(
        canTransition(
          "deskReject",
          baseCtx({
            status: "DESK_REVIEW",
            submissionRoles: ["HANDLING_EDITOR"],
          }),
        ),
      ).toEqual({ ok: true });
    });
  });

  describe("sendToReview", () => {
    it("allows from DESK_REVIEW and RESUBMITTED", () => {
      expect(
        canTransition(
          "sendToReview",
          baseCtx({
            status: "DESK_REVIEW",
            submissionRoles: ["HANDLING_EDITOR"],
          }),
        ).ok,
      ).toBe(true);
      expect(
        canTransition(
          "sendToReview",
          baseCtx({
            status: "RESUBMITTED",
            submissionRoles: ["HANDLING_EDITOR"],
          }),
        ).ok,
      ).toBe(true);
    });
  });

  describe("recordDecision", () => {
    it("requires decision payload", () => {
      const result = canTransition(
        "recordDecision",
        baseCtx({
          status: "UNDER_REVIEW",
          submissionRoles: ["HANDLING_EDITOR"],
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/decision/i);
    });

    it("resolves ACCEPT to ACCEPTED", () => {
      const ctx = baseCtx({
        status: "UNDER_REVIEW",
        submissionRoles: ["HANDLING_EDITOR"],
        decision: "ACCEPT",
      });
      expect(canTransition("recordDecision", ctx)).toEqual({ ok: true });
      expect(resolveTransitionTarget("recordDecision", ctx)).toBe("ACCEPTED");
    });

    it("resolves MINOR_REVISION to REVISIONS_REQUESTED", () => {
      const ctx = baseCtx({
        status: "UNDER_REVIEW",
        submissionRoles: ["HANDLING_EDITOR"],
        decision: "MINOR_REVISION",
      });
      expect(resolveTransitionTarget("recordDecision", ctx)).toBe(
        "REVISIONS_REQUESTED",
      );
    });
  });

  describe("authorResubmit", () => {
    it("requires revision file", () => {
      const result = canTransition(
        "authorResubmit",
        baseCtx({ status: "REVISIONS_REQUESTED" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/revision/i);
    });

    it("allows with revision file", () => {
      expect(
        canTransition(
          "authorResubmit",
          baseCtx({
            status: "REVISIONS_REQUESTED",
            hasRevisionFile: true,
          }),
        ),
      ).toEqual({ ok: true });
    });
  });

  describe("createApcInvoice", () => {
    it("resolves to IN_PRODUCTION when apc is zero", () => {
      const ctx = baseCtx({
        status: "ACCEPTED",
        isSystemActor: true,
        apcAmount: 0,
      });
      expect(canTransition("createApcInvoice", ctx)).toEqual({ ok: true });
      expect(resolveTransitionTarget("createApcInvoice", ctx)).toBe(
        "IN_PRODUCTION",
      );
    });

    it("resolves to PAYMENT_PENDING when apc is positive", () => {
      const ctx = baseCtx({
        status: "ACCEPTED",
        isSystemActor: true,
        apcAmount: 500_000,
      });
      expect(resolveTransitionTarget("createApcInvoice", ctx)).toBe(
        "PAYMENT_PENDING",
      );
    });

    it("rejects when invoice already exists", () => {
      expect(
        canTransition(
          "createApcInvoice",
          baseCtx({
            status: "ACCEPTED",
            isSystemActor: true,
            hasInvoice: true,
          }),
        ).ok,
      ).toBe(false);
    });
  });

  describe("paymentSettled and waiveApc", () => {
    it("allows system paymentSettled with open invoice", () => {
      expect(
        canTransition(
          "paymentSettled",
          baseCtx({
            status: "PAYMENT_PENDING",
            isSystemActor: true,
            hasInvoice: true,
            invoiceStatus: "ISSUED",
          }),
        ),
      ).toEqual({ ok: true });
    });

    it("allows JOURNAL_ADMIN waiveApc", () => {
      expect(
        canTransition(
          "waiveApc",
          baseCtx({
            status: "PAYMENT_PENDING",
            journalRoles: ["JOURNAL_ADMIN"],
            hasInvoice: true,
            invoiceStatus: "ISSUED",
          }),
        ),
      ).toEqual({ ok: true });
    });
  });

  describe("publishToIssue", () => {
    it("requires issueId", () => {
      expect(
        canTransition(
          "publishToIssue",
          baseCtx({
            status: "IN_PRODUCTION",
            journalRoles: ["EDITOR_IN_CHIEF"],
          }),
        ).ok,
      ).toBe(false);
    });

    it("requires at least one galley", () => {
      expect(
        canTransition(
          "publishToIssue",
          baseCtx({
            status: "IN_PRODUCTION",
            journalRoles: ["EDITOR_IN_CHIEF"],
            issueId: "issue_1",
          }),
        ).ok,
      ).toBe(false);
    });

    it("allows with issueId and galley", () => {
      expect(
        canTransition(
          "publishToIssue",
          baseCtx({
            status: "IN_PRODUCTION",
            journalRoles: ["EDITOR_IN_CHIEF"],
            issueId: "issue_1",
            hasGalley: true,
          }),
        ),
      ).toEqual({ ok: true });
    });
  });

  describe("withdraw", () => {
    it("allows author from SUBMITTED", () => {
      expect(
        canTransition(
          "withdraw",
          baseCtx({ status: "SUBMITTED", submissionRoles: ["AUTHOR"] }),
        ),
      ).toEqual({ ok: true });
    });

    it("rejects from terminal PUBLISHED", () => {
      expect(
        canTransition(
          "withdraw",
          baseCtx({
            status: "PUBLISHED",
            submissionRoles: ["AUTHOR"],
          }),
        ).ok,
      ).toBe(false);
    });
  });

  describe("non-status transitions", () => {
    it("allows inviteReviewer without status change", () => {
      const result = canTransition(
        "inviteReviewer",
        baseCtx({
          status: "UNDER_REVIEW",
          submissionRoles: ["HANDLING_EDITOR"],
          reviewerId: "reviewer_1",
          reviewerAlreadyAssigned: false,
        }),
      );
      expect(result).toEqual({ ok: true });
      expect(TRANSITIONS.inviteReviewer.changesStatus).toBe(false);
    });

    it("requires active assignment for submitReview", () => {
      expect(
        canTransition(
          "submitReview",
          baseCtx({
            status: "UNDER_REVIEW",
            submissionRoles: ["REVIEWER"],
            hasActiveReviewAssignment: false,
            reviewRecommendation: "ACCEPT",
          }),
        ).ok,
      ).toBe(false);
      expect(
        canTransition(
          "submitReview",
          baseCtx({
            status: "UNDER_REVIEW",
            submissionRoles: ["REVIEWER"],
            hasActiveReviewAssignment: true,
            reviewRecommendation: "ACCEPT",
          }),
        ).ok,
      ).toBe(true);
    });
  });
});
