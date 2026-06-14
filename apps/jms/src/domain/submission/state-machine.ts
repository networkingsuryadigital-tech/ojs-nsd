import { decisionToStatus } from "./editorial-decision";
import type {
  JournalRole,
  SubmissionRole,
  SubmissionStatus,
  SubmissionTransitionContext,
  TransitionCheckResult,
  TransitionName,
} from "./types";
import { TERMINAL_STATUSES, WITHDRAWABLE_STATUSES } from "./types";

export type TransitionDefinition = {
  from: SubmissionStatus[];
  /** `dynamic` resolves via `resolveTransitionTarget()`. */
  to: SubmissionStatus | "dynamic";
  changesStatus: boolean;
  allowedSubmissionRoles?: SubmissionRole[];
  allowedJournalRoles?: JournalRole[];
  allowSystem?: boolean;
  eventType: string;
};

/** Full transition table per `03-editorial-workflow.md` §3. */
export const TRANSITIONS: Record<TransitionName, TransitionDefinition> = {
  submit: {
    from: ["DRAFT"],
    to: "SUBMITTED",
    changesStatus: true,
    allowedSubmissionRoles: ["AUTHOR", "CORRESPONDING_AUTHOR"],
    eventType: "STATUS_CHANGED",
  },
  assignToEditor: {
    from: ["SUBMITTED"],
    to: "DESK_REVIEW",
    changesStatus: true,
    allowedJournalRoles: ["EDITOR_IN_CHIEF", "SECTION_EDITOR"],
    eventType: "STATUS_CHANGED",
  },
  deskReject: {
    from: ["DESK_REVIEW"],
    to: "DESK_REJECTED",
    changesStatus: true,
    allowedSubmissionRoles: ["HANDLING_EDITOR"],
    eventType: "STATUS_CHANGED",
  },
  sendToReview: {
    from: ["DESK_REVIEW", "RESUBMITTED"],
    to: "UNDER_REVIEW",
    changesStatus: true,
    allowedSubmissionRoles: ["HANDLING_EDITOR"],
    eventType: "STATUS_CHANGED",
  },
  inviteReviewer: {
    from: ["UNDER_REVIEW"],
    to: "UNDER_REVIEW",
    changesStatus: false,
    allowedSubmissionRoles: ["HANDLING_EDITOR"],
    eventType: "REVIEWER_INVITED",
  },
  submitReview: {
    from: ["UNDER_REVIEW"],
    to: "UNDER_REVIEW",
    changesStatus: false,
    allowedSubmissionRoles: ["REVIEWER"],
    eventType: "REVIEW_SUBMITTED",
  },
  recordDecision: {
    from: ["UNDER_REVIEW", "RESUBMITTED"],
    to: "dynamic",
    changesStatus: true,
    allowedSubmissionRoles: ["HANDLING_EDITOR"],
    eventType: "DECISION_MADE",
  },
  authorResubmit: {
    from: ["REVISIONS_REQUESTED"],
    to: "RESUBMITTED",
    changesStatus: true,
    allowedSubmissionRoles: ["AUTHOR", "CORRESPONDING_AUTHOR"],
    eventType: "STATUS_CHANGED",
  },
  createApcInvoice: {
    from: ["ACCEPTED"],
    to: "dynamic",
    changesStatus: true,
    allowedJournalRoles: ["JOURNAL_ADMIN"],
    allowSystem: true,
    eventType: "APC_INVOICE_CREATED",
  },
  paymentSettled: {
    from: ["PAYMENT_PENDING"],
    to: "IN_PRODUCTION",
    changesStatus: true,
    allowSystem: true,
    eventType: "PAYMENT_SETTLED",
  },
  waiveApc: {
    from: ["PAYMENT_PENDING"],
    to: "IN_PRODUCTION",
    changesStatus: true,
    allowedJournalRoles: ["JOURNAL_ADMIN"],
    eventType: "APC_WAIVED",
  },
  uploadGalley: {
    from: ["IN_PRODUCTION"],
    to: "IN_PRODUCTION",
    changesStatus: false,
    allowedSubmissionRoles: ["COPYEDITOR", "HANDLING_EDITOR"],
    eventType: "GALLEY_UPLOADED",
  },
  publishToIssue: {
    from: ["IN_PRODUCTION"],
    to: "PUBLISHED",
    changesStatus: true,
    allowedJournalRoles: ["EDITOR_IN_CHIEF", "JOURNAL_ADMIN"],
    eventType: "PUBLISHED_TO_ISSUE",
  },
  withdraw: {
    from: WITHDRAWABLE_STATUSES,
    to: "WITHDRAWN",
    changesStatus: true,
    allowedSubmissionRoles: ["AUTHOR", "CORRESPONDING_AUTHOR", "HANDLING_EDITOR"],
    allowedJournalRoles: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    eventType: "WITHDRAWN",
  },
  retractPublication: {
    from: ["PUBLISHED"],
    to: "RETRACTED",
    changesStatus: true,
    allowedJournalRoles: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    eventType: "PUBLICATION_RETRACTED",
  },
  recordPublicationCorrection: {
    from: ["PUBLISHED"],
    to: "PUBLISHED",
    changesStatus: false,
    allowedJournalRoles: ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    eventType: "PUBLICATION_CORRECTED",
  },
};

export function resolveTransitionTarget(
  name: TransitionName,
  ctx: SubmissionTransitionContext,
): SubmissionStatus {
  const transition = TRANSITIONS[name];
  if (transition.to !== "dynamic") {
    return transition.to;
  }

  if (name === "recordDecision") {
    if (!ctx.decision) {
      throw new Error("Decision is required for recordDecision.");
    }
    return decisionToStatus(ctx.decision);
  }

  if (name === "createApcInvoice") {
    return ctx.apcAmount === 0 ? "IN_PRODUCTION" : "PAYMENT_PENDING";
  }

  throw new Error(`No dynamic target resolver for "${name}".`);
}

function hasSubmissionRole(
  ctx: SubmissionTransitionContext,
  roles: SubmissionRole[] | undefined,
): boolean {
  if (!roles?.length) return false;
  return ctx.submissionRoles.some((role) => roles.includes(role));
}

function hasJournalRole(
  ctx: SubmissionTransitionContext,
  roles: JournalRole[] | undefined,
): boolean {
  if (!roles?.length) return false;
  return ctx.journalRoles.some((role) => roles.includes(role));
}

function isRolePermitted(
  transition: TransitionDefinition,
  ctx: SubmissionTransitionContext,
): boolean {
  if (transition.allowSystem && ctx.isSystemActor) {
    return true;
  }

  return (
    hasSubmissionRole(ctx, transition.allowedSubmissionRoles) ||
    hasJournalRole(ctx, transition.allowedJournalRoles)
  );
}

function runTransitionGuard(
  name: TransitionName,
  ctx: SubmissionTransitionContext,
): TransitionCheckResult {
  switch (name) {
    case "submit":
      if (!ctx.hasManuscript) {
        return { ok: false, reason: "Manuscript file is required before submit." };
      }
      if (!ctx.hasPrimaryTranslation) {
        return {
          ok: false,
          reason: "Primary translation metadata is required before submit.",
        };
      }
      return { ok: true };

    case "inviteReviewer":
      if (!ctx.reviewerId) {
        return { ok: false, reason: "reviewerId is required to invite." };
      }
      if (ctx.reviewerAlreadyAssigned) {
        return {
          ok: false,
          reason: "Reviewer is already assigned for this round.",
        };
      }
      return { ok: true };

    case "submitReview":
      if (!ctx.hasActiveReviewAssignment) {
        return {
          ok: false,
          reason: "Reviewer has no active assignment for this submission.",
        };
      }
      if (!ctx.reviewRecommendation) {
        return { ok: false, reason: "Review recommendation is required." };
      }
      return { ok: true };

    case "recordDecision":
      if (!ctx.decision) {
        return { ok: false, reason: "Decision payload is required." };
      }
      return { ok: true };

    case "authorResubmit":
      if (!ctx.hasRevisionFile) {
        return {
          ok: false,
          reason: "Revision file is required before resubmit.",
        };
      }
      return { ok: true };

    case "createApcInvoice":
      if (ctx.hasInvoice) {
        return { ok: false, reason: "APC invoice already exists." };
      }
      return { ok: true };

    case "paymentSettled":
      if (!ctx.hasInvoice) {
        return { ok: false, reason: "No APC invoice to settle." };
      }
      if (ctx.invoiceStatus === "PAID" || ctx.invoiceStatus === "WAIVED") {
        return { ok: false, reason: "Invoice is already settled." };
      }
      return { ok: true };

    case "waiveApc":
      if (!ctx.hasInvoice) {
        return { ok: false, reason: "No APC invoice to waive." };
      }
      if (ctx.invoiceStatus === "PAID" || ctx.invoiceStatus === "WAIVED") {
        return { ok: false, reason: "Invoice is already settled." };
      }
      return { ok: true };

    case "publishToIssue":
      if (!ctx.issueId) {
        return { ok: false, reason: "issueId is required to publish." };
      }
      if (!ctx.hasGalley) {
        return {
          ok: false,
          reason: "At least one galley is required before publishing.",
        };
      }
      return { ok: true };

    case "withdraw":
      if (TERMINAL_STATUSES.includes(ctx.status)) {
        return { ok: false, reason: "Cannot withdraw a terminal submission." };
      }
      return { ok: true };

    case "retractPublication":
      if (!ctx.hasRegisteredDoi) {
        return {
          ok: false,
          reason: "DOI harus terdaftar sebelum retraction.",
        };
      }
      return { ok: true };

    case "recordPublicationCorrection":
      if (!ctx.hasRegisteredDoi) {
        return {
          ok: false,
          reason: "DOI harus terdaftar sebelum correction/erratum.",
        };
      }
      return { ok: true };

    default:
      return { ok: true };
  }
}

export function canTransition(
  name: TransitionName,
  ctx: SubmissionTransitionContext,
): TransitionCheckResult {
  const transition = TRANSITIONS[name];

  if (!transition.from.includes(ctx.status)) {
    return {
      ok: false,
      reason: `Cannot "${name}" from status ${ctx.status}.`,
    };
  }

  if (!isRolePermitted(transition, ctx)) {
    return {
      ok: false,
      reason: `Role not permitted to "${name}".`,
    };
  }

  return runTransitionGuard(name, ctx);
}

export function isAuthorRole(roles: SubmissionRole[]): boolean {
  return roles.some(
    (role) => role === "AUTHOR" || role === "CORRESPONDING_AUTHOR",
  );
}
