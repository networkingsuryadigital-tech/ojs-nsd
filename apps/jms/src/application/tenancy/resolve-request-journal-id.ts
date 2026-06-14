import "server-only";

import { getJournalIdFromRequestHeaders } from "@/infrastructure/tenancy/request-tenant";

export async function resolveRequestJournalId(): Promise<string> {
  const journalId = await getJournalIdFromRequestHeaders();
  if (!journalId) {
    throw new Error("Tenant journal not resolved.");
  }
  return journalId;
}
