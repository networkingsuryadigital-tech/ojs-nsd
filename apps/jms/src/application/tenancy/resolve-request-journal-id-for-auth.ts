import "server-only";

import { headers } from "next/headers";

import { lookupJournalByHostFromDb } from "@/infrastructure/tenancy/journal-lookup";
import { getJournalIdFromRequestHeaders } from "@/infrastructure/tenancy/request-tenant";

/**
 * Resolves tenant journal id for auth flows (login action).
 * Middleware sets x-journal-id on page GET; Server Actions may miss it — fall back to Host lookup.
 */
export async function resolveRequestJournalIdForAuth(): Promise<string | null> {
  const fromHeader = await getJournalIdFromRequestHeaders();
  if (fromHeader) {
    return fromHeader;
  }

  const headerStore = await headers();
  const host = headerStore.get("host")?.trim();
  if (!host) {
    return null;
  }

  const journal = await lookupJournalByHostFromDb(host);
  return journal?.id ?? null;
}
