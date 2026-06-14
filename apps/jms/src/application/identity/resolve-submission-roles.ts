import "server-only";

import { isAuthorRole } from "@/domain/submission/state-machine";
import type { SubmissionRole } from "@/domain/submission/types";
import { listSubmissionRoles } from "@/infrastructure/submission/submission-repository";

export async function resolveSubmissionRoles(
  journalId: string,
  submissionId: string,
  userId: string,
): Promise<SubmissionRole[]> {
  return listSubmissionRoles(journalId, submissionId, userId);
}

export async function assertAuthorOnSubmission(
  journalId: string,
  submissionId: string,
  userId: string,
): Promise<SubmissionRole[]> {
  const roles = await resolveSubmissionRoles(journalId, submissionId, userId);
  if (!isAuthorRole(roles)) {
    throw new Error("Only submission authors may perform this action.");
  }
  return roles;
}
