import "server-only";

import { z } from "zod";

import { nextAnonymousLabel } from "@/domain/review/anonymous-label";
import { commentsToAuthorAppearSafe } from "@/domain/review/comment-safety";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import {
  parsePublicationNoticeReason,
  parsePublicationNoticeType,
  type PublicationNoticeType,
} from "@/domain/publication/notice";
import { ForbiddenTransitionError } from "@/domain/submission/errors";
import {
  TRANSITIONS,
  canTransition,
  resolveTransitionTarget,
} from "@/domain/submission/state-machine";
import {
  EDITORIAL_DECISION_TYPES,
  REVIEW_RECOMMENDATIONS,
  TRANSITION_NAMES,
  type EditorialDecisionType,
  type ReviewRecommendation,
  type TransitionSubmissionInput,
} from "@/domain/submission/types";
import { listAssignmentLabels } from "@/infrastructure/review/review-repository";
import { ensureAnonymizedManuscript } from "@/infrastructure/submission/anonymization-pipeline";
import {
  addSubmissionParticipant,
  applySubmissionTransition,
  loadJournalReviewModel,
  loadSubmissionTransitionContext,
} from "@/infrastructure/submission/submission-repository";
import { emitTransitionNotifications } from "@/application/notification/emit-transition-notifications";
import { reportSideEffectFailure } from "@/infrastructure/observability/report-side-effect-failure";

const transitionSubmissionSchema = z
  .object({
    journalId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
    actorId: z.string().trim().min(1).optional(),
    isSystemActor: z.boolean().optional(),
    name: z.enum(TRANSITION_NAMES),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.isSystemActor === true || data.actorId !== undefined, {
    message: "actorId is required unless isSystemActor is true.",
  });

function parseDecision(
  payload: Record<string, unknown> | undefined,
): EditorialDecisionType | undefined {
  const raw = payload?.decision;
  if (typeof raw !== "string") return undefined;
  return EDITORIAL_DECISION_TYPES.includes(raw as EditorialDecisionType)
    ? (raw as EditorialDecisionType)
    : undefined;
}

function parseIssueId(
  payload: Record<string, unknown> | undefined,
): string | undefined {
  const raw = payload?.issueId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseHandlingEditorId(
  payload: Record<string, unknown> | undefined,
): string | undefined {
  const raw = payload?.handlingEditorId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseReviewerId(
  payload: Record<string, unknown> | undefined,
): string | undefined {
  const raw = payload?.reviewerId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseReviewDueAt(
  payload: Record<string, unknown> | undefined,
): Date | undefined {
  const raw = payload?.dueAt;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseReviewRecommendation(
  payload: Record<string, unknown> | undefined,
): ReviewRecommendation | undefined {
  const raw = payload?.recommendation;
  if (typeof raw !== "string") return undefined;
  return REVIEW_RECOMMENDATIONS.includes(raw as ReviewRecommendation)
    ? (raw as ReviewRecommendation)
    : undefined;
}

function parseOptionalString(
  payload: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const raw = payload?.[key];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseOptionalScore(
  payload: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const raw = payload?.[key];
  return typeof raw === "number" && Number.isInteger(raw) ? raw : undefined;
}

/**
 * Single entry point for submission workflow transitions (Sprint 6: full §03 table).
 */
export async function transitionSubmission(
  input: TransitionSubmissionInput,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = transitionSubmissionSchema.parse(input);
  const issueId = parseIssueId(parsed.payload);
  const decision = parseDecision(parsed.payload);
  const reviewerId = parseReviewerId(parsed.payload);
  const reviewRecommendation = parseReviewRecommendation(parsed.payload);
  const commentsToAuthor = parseOptionalString(parsed.payload, "commentsToAuthor");

  let publicationNoticeType: PublicationNoticeType | undefined;
  let publicationNoticeReason: string | undefined;
  if (parsed.name === "retractPublication") {
    publicationNoticeType = "RETRACTION";
    publicationNoticeReason = parsePublicationNoticeReason(
      parseOptionalString(parsed.payload, "noticeReason"),
    );
  } else if (parsed.name === "recordPublicationCorrection") {
    publicationNoticeType = parsePublicationNoticeType(
      parseOptionalString(parsed.payload, "noticeType"),
    );
    publicationNoticeReason = parsePublicationNoticeReason(
      parseOptionalString(parsed.payload, "noticeReason"),
    );
  }

  if (
    parsed.name === "submitReview" &&
    commentsToAuthor &&
    !commentsToAuthorAppearSafe(commentsToAuthor)
  ) {
    throw new ForbiddenTransitionError(
      "Comments to author may contain identifying information.",
    );
  }

  const submission = await loadSubmissionTransitionContext(
    parsed.journalId,
    parsed.submissionId,
    {
      actorId: parsed.actorId,
      issueId,
      reviewerId: parsed.name === "inviteReviewer" ? reviewerId : undefined,
    },
  );
  if (!submission) {
    throw new Error("Submission not found.");
  }

  const [submissionRoles, journalRoles] = await Promise.all([
    parsed.actorId
      ? resolveSubmissionRoles(
          parsed.journalId,
          parsed.submissionId,
          parsed.actorId,
        )
      : Promise.resolve([]),
    parsed.actorId
      ? resolveJournalRoles(parsed.journalId, parsed.actorId)
      : Promise.resolve([]),
  ]);

  const ctx = {
    status: submission.status,
    submissionRoles,
    journalRoles,
    isSystemActor: parsed.isSystemActor === true,
    hasManuscript: submission.hasManuscript,
    hasPrimaryTranslation: submission.hasPrimaryTranslation,
    hasRevisionFile: submission.hasRevisionFile,
    reviewRound: submission.reviewRound,
    apcAmount: submission.apcAmount,
    hasInvoice: submission.hasInvoice,
    invoiceStatus: submission.invoiceStatus,
    hasActiveReviewAssignment: submission.hasActiveReviewAssignment,
    reviewerId,
    reviewerAlreadyAssigned: submission.reviewerAlreadyAssigned,
    reviewRecommendation,
    issueId: issueId ?? submission.issueId,
    hasGalley: submission.hasGalley,
    hasRegisteredDoi: submission.hasRegisteredDoi,
    decision,
  };

  const check = canTransition(parsed.name, ctx);
  if (!check.ok) {
    throw new ForbiddenTransitionError(check.reason);
  }

  const transition = TRANSITIONS[parsed.name];
  const toStatus = resolveTransitionTarget(parsed.name, ctx);
  const eventToStatus = transition.changesStatus
    ? toStatus
    : submission.status;

  const now = new Date();
  const nextReviewRound =
    parsed.name === "authorResubmit"
      ? submission.reviewRound + 1
      : submission.reviewRound;

  const handlingEditorId = parseHandlingEditorId(parsed.payload);
  if (parsed.name === "assignToEditor" && handlingEditorId) {
    await addSubmissionParticipant(parsed.journalId, {
      submissionId: parsed.submissionId,
      userId: handlingEditorId,
      role: "HANDLING_EDITOR",
    });
  }

  let anonymousLabel: string | undefined;
  if (parsed.name === "inviteReviewer" && reviewerId) {
    const existingLabels = await listAssignmentLabels(
      parsed.journalId,
      parsed.submissionId,
    );
    anonymousLabel = nextAnonymousLabel(existingLabels);
  }

  const reviewPayload =
    parsed.name === "submitReview" &&
    parsed.actorId &&
    submission.activeAssignmentId &&
    reviewRecommendation
      ? {
          assignmentId: submission.activeAssignmentId,
          reviewerId: parsed.actorId,
          recommendation: reviewRecommendation,
          commentsToAuthor,
          commentsToEditor: parseOptionalString(parsed.payload, "commentsToEditor"),
          scoreOriginality: parseOptionalScore(parsed.payload, "scoreOriginality"),
          scoreClarity: parseOptionalScore(parsed.payload, "scoreClarity"),
          scoreContribution: parseOptionalScore(parsed.payload, "scoreContribution"),
        }
      : undefined;

  await applySubmissionTransition(parsed.journalId, {
    submissionId: parsed.submissionId,
    actorId: parsed.actorId ?? null,
    transitionName: parsed.name,
    fromStatus: submission.status,
    toStatus: eventToStatus,
    eventType: transition.eventType,
    payload: parsed.payload,
    reviewRound: nextReviewRound,
    submittedAt: parsed.name === "submit" ? now : undefined,
    acceptedAt:
      parsed.name === "recordDecision" && decision === "ACCEPT" ? now : undefined,
    publishedAt: parsed.name === "publishToIssue" ? now : undefined,
    issueId: parsed.name === "publishToIssue" ? issueId : undefined,
    publicationNoticeType,
    publicationNoticeReason,
    publicationNoticeAt:
      publicationNoticeType && publicationNoticeReason ? now : undefined,
    decision,
    apcAmount: submission.apcAmount,
    apcCurrency: "IDR",
    reviewerId,
    anonymousLabel,
    reviewDueAt: parseReviewDueAt(parsed.payload),
    reviewPayload,
  });

  if (parsed.name === "sendToReview") {
    const reviewModel = await loadJournalReviewModel(parsed.journalId);
    if (reviewModel === "DOUBLE_BLIND") {
      await ensureAnonymizedManuscript(
        parsed.journalId,
        parsed.submissionId,
        submission.reviewRound,
      );
    }
  }

  if (parsed.name === "recordDecision" && decision === "ACCEPT") {
    try {
      const { issueApcInvoice } = await import(
        "@/application/billing/issue-apc-invoice"
      );
      await issueApcInvoice({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "issueApcInvoice",
        error,
        actorId: parsed.actorId,
      });
    }

    try {
      await emitTransitionNotifications({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        transitionName: "recordDecision",
        payload: parsed.payload,
        decision,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "emitTransitionNotifications:recordDecisionAccept",
        error,
        actorId: parsed.actorId,
      });
    }
  } else if (parsed.name !== "createApcInvoice") {
    try {
      await emitTransitionNotifications({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        transitionName: parsed.name,
        payload: parsed.payload,
        decision,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: `emitTransitionNotifications:${parsed.name}`,
        error,
        actorId: parsed.actorId,
      });
    }
  }

  if (parsed.name === "assignToEditor") {
    try {
      const { enqueueSimilarityCheck } = await import(
        "@/application/similarity/enqueue-similarity-check"
      );
      await enqueueSimilarityCheck({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "enqueueSimilarityCheck",
        error,
        actorId: parsed.actorId,
      });
    }
  }

  if (
    parsed.name === "retractPublication" ||
    parsed.name === "recordPublicationCorrection"
  ) {
    try {
      const { invalidateOaiCache } = await import(
        "@/application/oai/invalidate-oai-cache"
      );
      await invalidateOaiCache(parsed.journalId);
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "invalidateOaiCache",
        error,
        actorId: parsed.actorId,
      });
    }

    try {
      const { enqueueDoiMetadataUpdate } = await import(
        "@/application/doi/enqueue-doi-metadata-update"
      );
      await enqueueDoiMetadataUpdate({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        depositKind:
          parsed.name === "retractPublication" ? "RETRACTION" : "CORRECTION",
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "enqueueDoiMetadataUpdate",
        error,
        actorId: parsed.actorId,
      });
    }
  }

  if (parsed.name === "publishToIssue") {
    try {
      const { invalidateOaiCache } = await import(
        "@/application/oai/invalidate-oai-cache"
      );
      await invalidateOaiCache(parsed.journalId);
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "invalidateOaiCache",
        error,
        actorId: parsed.actorId,
      });
    }

    try {
      const { enqueueDoiDeposit } = await import(
        "@/application/doi/enqueue-doi-deposit"
      );
      await enqueueDoiDeposit({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: parsed.journalId,
        submissionId: parsed.submissionId,
        effect: "enqueueDoiDeposit",
        error,
        actorId: parsed.actorId,
      });
    }
  }

  return {
    fromStatus: submission.status,
    toStatus: transition.changesStatus ? toStatus : submission.status,
    eventType: transition.eventType,
  };
}
