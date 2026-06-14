import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { isAuthorRole } from "@/domain/submission/state-machine";
import { suggestReviewers } from "@/application/reviewer-matching/suggest-reviewers";
import type { ReviewerSuggestionView } from "@/application/reviewer-matching/suggest-reviewers";
import { classifySimilarityScore } from "@/domain/similarity/score";
import type { SimilarityGatePolicy, SimilarityStatus } from "@/domain/similarity/types";
import {
  evaluateSubmissionSimilarityGate,
  loadJournalSimilaritySettings,
} from "@/infrastructure/similarity/journal-similarity-settings";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import type { EditorialDecisionType } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

const getDeskReviewDetailSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type DeskReviewDetail = {
  submissionId: string;
  status: string;
  reviewRound: number;
  title: string;
  abstract: string;
  authors: Array<{
    fullName: string;
    email: string | null;
    affiliation: string | null;
  }>;
  assignments: Array<{
    id: string;
    round: number;
    anonymousLabel: string | null;
    status: string;
    reviewerName: string | null;
    dueAt: Date | null;
  }>;
  decisions: Array<{
    id: string;
    round: number;
    decision: EditorialDecisionType;
    note: string | null;
    createdAt: Date;
  }>;
  revisionFiles: Array<{
    id: string;
    round: number;
    originalName: string;
    createdAt: Date;
  }>;
  pendingRevisionRound: number | null;
  hasRevisionFileForPendingRound: boolean;
  actorIsEditor: boolean;
  actorIsAuthor: boolean;
  similarity: {
    status: SimilarityStatus;
    score: number | null;
    reportUrl: string | null;
    severity: "low" | "moderate" | "high" | null;
    gate: {
      policy: SimilarityGatePolicy;
      thresholdPercent: number;
      blocked: boolean;
      requiresAcknowledgment: boolean;
      warning: string | null;
      reason: string | null;
    } | null;
  } | null;
  availableTransitions: Array<
    | "assignToEditor"
    | "deskReject"
    | "sendToReview"
    | "inviteReviewer"
    | "recordDecision"
    | "authorResubmit"
  >;
  reviewerSuggestions: ReviewerSuggestionView[] | null;
  reviewerMatchingProvider: string | null;
};

export async function getDeskReviewDetail(
  input: z.infer<typeof getDeskReviewDetailSchema>,
): Promise<DeskReviewDetail> {
  const parsed = getDeskReviewDetailSchema.parse(input);

  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(parsed.journalId, parsed.submissionId, parsed.actorId),
    resolveJournalRoles(parsed.journalId, parsed.actorId),
  ]);

  const actorIsEditor =
    submissionRoles.includes("HANDLING_EDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("SECTION_EDITOR");
  const actorIsAuthor = isAuthorRole(submissionRoles);

  if (!actorIsEditor && !actorIsAuthor) {
    throw new SubmissionAuthorizationError();
  }

  const submission = await withTenant(parsed.journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: parsed.submissionId, journalId: parsed.journalId },
      select: {
        id: true,
        status: true,
        reviewRound: true,
        similarityStatus: true,
        similarityScore: true,
        similarityReportUrl: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true, abstract: true },
          take: 1,
        },
        authors: {
          select: { fullName: true, email: true, affiliation: true },
          orderBy: { order: "asc" },
        },
        reviewAssignments: {
          select: {
            id: true,
            round: true,
            anonymousLabel: true,
            status: true,
            dueAt: true,
          },
          orderBy: { invitedAt: "asc" },
        },
        decisions: {
          select: {
            id: true,
            round: true,
            decision: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        files: {
          where: { type: "REVISION" },
          select: {
            id: true,
            round: true,
            originalName: true,
            createdAt: true,
          },
          orderBy: { round: "asc" },
        },
      },
    }),
  );

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const primary = submission.translations[0];
  const pendingRevisionRound =
    submission.status === "REVISIONS_REQUESTED"
      ? submission.reviewRound + 1
      : null;
  const hasRevisionFileForPendingRound = pendingRevisionRound
    ? submission.files.some((file) => file.round === pendingRevisionRound)
    : false;

  const availableTransitions: DeskReviewDetail["availableTransitions"] = [];

  if (actorIsEditor) {
    if (submission.status === "SUBMITTED") {
      availableTransitions.push("assignToEditor");
    }
    if (submission.status === "DESK_REVIEW") {
      availableTransitions.push("deskReject", "sendToReview");
    }
    if (submission.status === "UNDER_REVIEW") {
      availableTransitions.push("inviteReviewer", "recordDecision");
    }
    if (submission.status === "RESUBMITTED") {
      availableTransitions.push("sendToReview", "recordDecision");
    }
  }

  if (
    actorIsAuthor &&
    submission.status === "REVISIONS_REQUESTED" &&
    hasRevisionFileForPendingRound
  ) {
    availableTransitions.push("authorResubmit");
  }

  const similarityStatus = submission.similarityStatus as SimilarityStatus;
  const similarityScore = submission.similarityScore;
  let similarity: DeskReviewDetail["similarity"] = null;

  if (actorIsEditor) {
    const journalSettings = await loadJournalSimilaritySettings(parsed.journalId);
    const gateEvaluation = evaluateSubmissionSimilarityGate({
      settings: journalSettings,
      status: similarityStatus,
      score: similarityScore,
      acknowledgedHighSimilarity: false,
    });

    similarity = {
      status: similarityStatus,
      score: similarityScore,
      reportUrl: submission.similarityReportUrl,
      severity:
        similarityStatus === "COMPLETED" && similarityScore !== null
          ? classifySimilarityScore(similarityScore)
          : null,
      gate: {
        policy: journalSettings.gatePolicy,
        thresholdPercent: journalSettings.blockThresholdPercent,
        blocked: gateEvaluation.blocked,
        requiresAcknowledgment: gateEvaluation.requiresAcknowledgment,
        warning: gateEvaluation.warning,
        reason: gateEvaluation.reason,
      },
    };
  }

  let reviewerSuggestions: ReviewerSuggestionView[] | null = null;
  let reviewerMatchingProvider: string | null = null;

  if (actorIsEditor && submission.status === "UNDER_REVIEW") {
    const matchResult = await suggestReviewers({
      journalId: parsed.journalId,
      submissionId: parsed.submissionId,
      actorId: parsed.actorId,
    });
    reviewerSuggestions = matchResult.suggestions;
    reviewerMatchingProvider = matchResult.provider;
  }

  return {
    submissionId: submission.id,
    status: submission.status,
    reviewRound: submission.reviewRound,
    title: primary?.title ?? "(untitled)",
    abstract: primary?.abstract ?? "",
    authors: submission.authors,
    assignments: submission.reviewAssignments.map((assignment) => ({
      id: assignment.id,
      round: assignment.round,
      anonymousLabel: assignment.anonymousLabel,
      status: assignment.status,
      reviewerName: null,
      dueAt: assignment.dueAt,
    })),
    decisions: submission.decisions.map((decision) => ({
      id: decision.id,
      round: decision.round,
      decision: decision.decision as EditorialDecisionType,
      note: decision.note,
      createdAt: decision.createdAt,
    })),
    revisionFiles: submission.files,
    pendingRevisionRound,
    hasRevisionFileForPendingRound,
    actorIsEditor,
    actorIsAuthor,
    similarity,
    availableTransitions,
    reviewerSuggestions,
    reviewerMatchingProvider,
  };
}
