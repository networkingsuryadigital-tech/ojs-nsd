import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import {
  getAuthorSubmissionDetailFromDb,
  listAuthorSubmissionsFromDb,
  listJournalSectionsFromDb,
} from "@/infrastructure/submission/author-submission-repository";

const journalActorSchema = z.object({
  journalId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
});

async function assertAuthorJournalAccess(
  journalId: string,
  actorUserId: string,
): Promise<void> {
  const roles = await resolveJournalRoles(journalId, actorUserId);
  if (!roles.includes("AUTHOR")) {
    throw new SubmissionAuthorizationError(
      "Only authors may access the author portal.",
    );
  }
}

export async function listAuthorSubmissions(
  input: z.infer<typeof journalActorSchema>,
) {
  const parsed = journalActorSchema.parse(input);
  await assertAuthorJournalAccess(parsed.journalId, parsed.actorUserId);
  return listAuthorSubmissionsFromDb(parsed.journalId, parsed.actorUserId);
}

const submissionActorSchema = journalActorSchema.extend({
  submissionId: z.string().trim().min(1),
});

export async function getAuthorSubmissionDetail(
  input: z.infer<typeof submissionActorSchema>,
) {
  const parsed = submissionActorSchema.parse(input);
  await assertAuthorJournalAccess(parsed.journalId, parsed.actorUserId);

  const detail = await getAuthorSubmissionDetailFromDb(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorUserId,
  );
  if (!detail) {
    throw new SubmissionAuthorizationError();
  }
  return detail;
}

export async function listJournalSections(
  input: z.infer<typeof journalActorSchema>,
) {
  const parsed = journalActorSchema.parse(input);
  await assertAuthorJournalAccess(parsed.journalId, parsed.actorUserId);
  return listJournalSectionsFromDb(parsed.journalId);
}
