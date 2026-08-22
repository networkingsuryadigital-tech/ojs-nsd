import "server-only";

import { headers } from "next/headers";

import { lookupJournalByHostFromDb } from "@/infrastructure/tenancy/journal-lookup";
import { getJournalIdFromRequestHeaders } from "@/infrastructure/tenancy/request-tenant";

/**
 * Resolves tenant journal id for auth flows (login action).
 * Uses shared request-tenant resolution (header or Host → Postgres).
 */
export async function resolveRequestJournalIdForAuth(): Promise<string | null> {
  const fromRequest = await getJournalIdFromRequestHeaders();
  if (fromRequest) {
    return fromRequest;
  }

  // Extra Host pass if headers() was empty in an unusual context.
  const headerStore = await headers();
  const host = headerStore.get("host")?.trim();
  if (!host) {
    return null;
  }

  const journal = await lookupJournalByHostFromDb(host);
  return journal?.id ?? null;
}
