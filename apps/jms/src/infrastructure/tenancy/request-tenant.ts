import "server-only";

import { headers } from "next/headers";

import { JOURNAL_ID_HEADER } from "@/domain/tenancy/request-headers";
import { resolveJournalByHost } from "@/infrastructure/tenancy/resolver";

/**
 * Resolves tenant journal id for the current request.
 * Prefers x-journal-id when present; otherwise looks up Host via Redis + Postgres.
 */
export async function getJournalIdFromRequestHeaders(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(JOURNAL_ID_HEADER)?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const host = headerStore.get("host")?.trim();
  if (!host) {
    return null;
  }

  const journal = await resolveJournalByHost(host);
  return journal?.id ?? null;
}
