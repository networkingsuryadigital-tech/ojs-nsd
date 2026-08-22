import type { ResolvedJournal } from "@/domain/tenancy/types";
import { lookupJournalByHostFromDb } from "./journal-lookup";
import {
  getCachedJournalByHost,
  setCachedJournalByHost,
} from "./tenant-cache";

export type { ResolvedJournal };

/**
 * Resolves active journal from HTTP Host (subdomain platform or custom domain).
 * Uses Redis cache with Postgres (Prisma) lookup on miss.
 * Call from Node server code only (not Edge middleware).
 */
export async function resolveJournalByHost(
  host: string,
): Promise<ResolvedJournal | null> {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) {
    return null;
  }

  const cached = await getCachedJournalByHost(normalizedHost);
  if (cached !== undefined) {
    return cached;
  }

  const journal = await lookupJournalByHostFromDb(normalizedHost);
  await setCachedJournalByHost(normalizedHost, journal);
  return journal;
}
