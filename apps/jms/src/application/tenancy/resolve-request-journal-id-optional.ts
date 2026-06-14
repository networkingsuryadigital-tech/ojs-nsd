import "server-only";

import { getJournalIdFromRequestHeaders } from "@/infrastructure/tenancy/request-tenant";

export async function resolveRequestJournalIdOptional(): Promise<string | null> {
  return getJournalIdFromRequestHeaders();
}
