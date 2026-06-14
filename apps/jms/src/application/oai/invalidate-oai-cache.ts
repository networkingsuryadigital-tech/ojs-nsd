import "server-only";

import { bumpOaiCacheVersion } from "@/infrastructure/oai/oai-cache";

export async function invalidateOaiCache(journalId: string): Promise<void> {
  await bumpOaiCacheVersion(journalId);
}
