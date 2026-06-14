import "server-only";

import type { JournalRole } from "@/domain/submission/types";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";

export async function assertJournalRoles(
  journalId: string,
  actorId: string,
  allowedRoles: JournalRole[],
  message: string,
): Promise<JournalRole[]> {
  const roles = await resolveJournalRoles(journalId, actorId);
  const permitted = roles.some((role) => allowedRoles.includes(role));
  if (!permitted) {
    throw new SubmissionAuthorizationError(message);
  }
  return roles;
}
