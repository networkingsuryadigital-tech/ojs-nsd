import "server-only";

import { headers } from "next/headers";

import { JOURNAL_ID_HEADER } from "@/domain/tenancy/request-headers";

/** Reads tenant journal id set by middleware — no host lookup. */
export async function getJournalIdFromRequestHeaders(): Promise<string | null> {
  const headerStore = await headers();
  const journalId = headerStore.get(JOURNAL_ID_HEADER);
  if (!journalId?.trim()) {
    return null;
  }
  return journalId.trim();
}
