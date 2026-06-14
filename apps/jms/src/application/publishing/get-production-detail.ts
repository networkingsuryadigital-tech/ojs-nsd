import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { canTransition } from "@/domain/submission/state-machine";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import type { SubmissionStatus } from "@/domain/submission/types";
import { formatIssueCitation } from "@/domain/publishing/issue";
import { GALLEY_LABELS } from "@/domain/publishing/types";
import { listGalleysForSubmission } from "@/infrastructure/publishing/galley-repository";
import { listIssuesInJournal } from "@/infrastructure/publishing/issue-repository";
import { loadSubmissionTransitionContext } from "@/infrastructure/submission/submission-repository";
import { withTenant } from "@/infrastructure/db/with-tenant";

const getProductionDetailSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type ProductionDetail = {
  submissionId: string;
  status: string;
  title: string;
  galleys: Array<{
    id: string;
    label: string;
    mimeType: string;
    createdAt: Date;
  }>;
  issues: Array<{
    id: string;
    citation: string;
    isPublished: boolean;
  }>;
  actorCanUploadGalley: boolean;
  actorCanPublish: boolean;
  publishIssueId: string | null;
  galleyLabels: readonly string[];
};

export async function getProductionDetail(
  input: z.infer<typeof getProductionDetailSchema>,
): Promise<ProductionDetail> {
  const parsed = getProductionDetailSchema.parse(input);

  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(parsed.journalId, parsed.submissionId, parsed.actorId),
    resolveJournalRoles(parsed.journalId, parsed.actorId),
  ]);

  const actorIsProductionStaff =
    submissionRoles.includes("HANDLING_EDITOR") ||
    submissionRoles.includes("COPYEDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("JOURNAL_ADMIN") ||
    journalRoles.includes("SECTION_EDITOR");

  if (!actorIsProductionStaff) {
    throw new SubmissionAuthorizationError();
  }

  const submission = await withTenant(parsed.journalId, (tx) =>
    tx.submission.findFirst({
      where: { id: parsed.submissionId, journalId: parsed.journalId },
      select: {
        id: true,
        status: true,
        issueId: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
      },
    }),
  );

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const [galleys, issues, transitionCtx] = await Promise.all([
    listGalleysForSubmission(parsed.journalId, parsed.submissionId),
    listIssuesInJournal(parsed.journalId),
    loadSubmissionTransitionContext(parsed.journalId, parsed.submissionId, {
      actorId: parsed.actorId,
    }),
  ]);

  const ctx = {
    status: submission.status as SubmissionStatus,
    submissionRoles,
    journalRoles,
    isSystemActor: false,
    hasManuscript: transitionCtx?.hasManuscript ?? false,
    hasPrimaryTranslation: transitionCtx?.hasPrimaryTranslation ?? false,
    hasRevisionFile: transitionCtx?.hasRevisionFile ?? false,
    reviewRound: transitionCtx?.reviewRound ?? 0,
    apcAmount: transitionCtx?.apcAmount ?? 0,
    hasInvoice: transitionCtx?.hasInvoice ?? false,
    invoiceStatus: transitionCtx?.invoiceStatus ?? null,
    hasActiveReviewAssignment: false,
    issueId: submission.issueId,
    hasGalley: galleys.length > 0,
    hasRegisteredDoi: transitionCtx?.hasRegisteredDoi ?? false,
  };

  const actorCanUploadGalley =
    submission.status === "IN_PRODUCTION" &&
    canTransition("uploadGalley", ctx).ok;
  const actorCanPublish =
    submission.status === "IN_PRODUCTION" &&
    issues.length > 0 &&
    canTransition("publishToIssue", {
      ...ctx,
      issueId: submission.issueId ?? issues[0]?.id ?? null,
    }).ok;

  return {
    submissionId: submission.id,
    status: submission.status,
    title: submission.translations[0]?.title ?? "(untitled)",
    galleys: galleys.map((galley) => ({
      id: galley.id,
      label: galley.label,
      mimeType: galley.mimeType,
      createdAt: galley.createdAt,
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      citation: formatIssueCitation(issue),
      isPublished: issue.isPublished,
    })),
    actorCanUploadGalley,
    actorCanPublish,
    publishIssueId: submission.issueId,
    galleyLabels: GALLEY_LABELS,
  };
}
