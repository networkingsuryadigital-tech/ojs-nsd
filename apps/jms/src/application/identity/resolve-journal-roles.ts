import "server-only";

import type { JournalRole } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function resolveJournalRoles(
  journalId: string,
  userId: string,
): Promise<JournalRole[]> {
  const membership = await withTenant(journalId, (tx) =>
    tx.journalMembership.findFirst({
      where: { journalId, userId, isActive: true },
      select: { roles: true },
    }),
  );
  return membership?.roles ?? [];
}
