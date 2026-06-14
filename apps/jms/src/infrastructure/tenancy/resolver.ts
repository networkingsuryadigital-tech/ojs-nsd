import type { ResolvedJournal } from "@/domain/tenancy/types";
import { lookupJournalByHostFromSupabase } from "./journal-lookup-edge";
import {
  getCachedJournalByHost,
  setCachedJournalByHost,
} from "./tenant-cache";

export type { ResolvedJournal };

/**
 * Resolves active journal from HTTP Host (subdomain platform or custom domain).
 * Uses Upstash cache with Supabase lookup on miss — Edge-safe for middleware.
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

  const journal = await lookupJournalByHostFromSupabase(normalizedHost);
  await setCachedJournalByHost(normalizedHost, journal);
  return journal;
}
