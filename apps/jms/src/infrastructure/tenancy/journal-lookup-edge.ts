import { createClient } from "@supabase/supabase-js";

import { parseTenantHost } from "@/domain/tenancy/host";
import type { ResolvedJournal } from "@/domain/tenancy/types";
import { getPlatformHost, toResolvedJournal } from "./platform-config";

type SupabaseJournalRow = {
  id: string;
  subdomain: string;
  name: string;
  isActive: boolean;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Edge-safe journal lookup for middleware (Supabase REST, no Prisma).
 * Falls back to null when Supabase credentials are unavailable.
 */
export async function lookupJournalByHostFromSupabase(
  host: string,
  platformHost: string = getPlatformHost(),
): Promise<ResolvedJournal | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const lookup = parseTenantHost(host, platformHost);
  if (lookup.kind === "platform_admin" || lookup.kind === "unknown") {
    return null;
  }

  if (lookup.kind === "subdomain") {
    const { data, error } = await supabase
      .from("Journal")
      .select("id, subdomain, name, isActive")
      .eq("subdomain", lookup.subdomain)
      .eq("isActive", true)
      .maybeSingle<SupabaseJournalRow>();

    if (error || !data) {
      return null;
    }
    return toResolvedJournal(data);
  }

  const { data: domain, error: domainError } = await supabase
    .from("JournalDomain")
    .select("journalId")
    .eq("host", lookup.host)
    .eq("verified", true)
    .eq("sslStatus", "ACTIVE")
    .maybeSingle<{ journalId: string }>();

  if (domainError || !domain) {
    return null;
  }

  const { data: journal, error: journalError } = await supabase
    .from("Journal")
    .select("id, subdomain, name, isActive")
    .eq("id", domain.journalId)
    .eq("isActive", true)
    .maybeSingle<SupabaseJournalRow>();

  if (journalError || !journal) {
    return null;
  }

  return toResolvedJournal(journal);
}
