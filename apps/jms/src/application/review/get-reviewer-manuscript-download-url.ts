import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { shouldUseAnonymizedManuscript } from "@/domain/review/anonymity";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { findReviewerAssignmentForSubmission } from "@/infrastructure/review/reviewer-assignment-repository";
import { createManuscriptSignedUrl } from "@/infrastructure/submission/file-storage";
import {
  loadJournalReviewModel,
} from "@/infrastructure/submission/submission-repository";
import { withTenant } from "@/infrastructure/db/with-tenant";

const getReviewerManuscriptDownloadUrlSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  fileId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

export async function getReviewerManuscriptDownloadUrl(
  input: z.infer<typeof getReviewerManuscriptDownloadUrlSchema>,
): Promise<string> {
  const parsed = getReviewerManuscriptDownloadUrlSchema.parse(input);

  const journalRoles = await resolveJournalRoles(
    parsed.journalId,
    parsed.actorUserId,
  );
  if (!journalRoles.includes("REVIEWER")) {
    throw new SubmissionAuthorizationError();
  }

  const assignment = await findReviewerAssignmentForSubmission(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );
  if (!assignment || assignment.status === "INVITED") {
    throw new SubmissionAuthorizationError(
      "Accept the review invitation before downloading the manuscript.",
    );
  }

  const submissionRoles = await resolveSubmissionRoles(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );
  const reviewModel = await loadJournalReviewModel(parsed.journalId);
  const useAnonymized = shouldUseAnonymizedManuscript(reviewModel, {
    reviewModel,
    submissionRoles,
    journalRoles,
  });
  const fileType = useAnonymized ? "ANONYMIZED_MANUSCRIPT" : "MANUSCRIPT";

  const file = await withTenant(parsed.journalId, (tx) =>
    tx.submissionFile.findFirst({
      where: {
        id: parsed.fileId,
        submissionId: parsed.submissionId,
        type: fileType,
        round: assignment.round,
      },
      select: { storageKey: true },
    }),
  );

  if (!file) {
    throw new Error("Manuscript file not found.");
  }

  return createManuscriptSignedUrl(file.storageKey);
}
