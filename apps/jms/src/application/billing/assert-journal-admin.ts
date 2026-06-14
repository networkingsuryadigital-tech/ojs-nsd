import "server-only";

import { BillingAuthorizationError } from "@/domain/billing/errors";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";

export async function assertJournalAdmin(
  journalId: string,
  actorId: string,
): Promise<void> {
  const roles = await resolveJournalRoles(journalId, actorId);
  if (!roles.includes("JOURNAL_ADMIN")) {
    throw new BillingAuthorizationError(
      "Only journal administrators may perform this billing action.",
    );
  }
}
