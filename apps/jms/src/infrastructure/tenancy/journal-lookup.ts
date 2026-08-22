import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";
import { parseTenantHost } from "@/domain/tenancy/host";
import type { ResolvedJournal } from "@/domain/tenancy/types";
import {
  getPlatformHost,
  getPrimaryJournalSubdomain,
  toResolvedJournal,
} from "./platform-config";

const journalSelect = {
  id: true,
  subdomain: true,
  name: true,
  isActive: true,
} as const;

async function findActiveJournalBySubdomain(
  subdomain: string,
): Promise<ResolvedJournal | null> {
  const journal = await adminDb.journal.findFirst({
    where: { subdomain, isActive: true },
    select: journalSelect,
  });
  return journal ? toResolvedJournal(journal) : null;
}

export async function lookupJournalByHostFromDb(
  host: string,
  platformHost: string = getPlatformHost(),
): Promise<ResolvedJournal | null> {
  const lookup = parseTenantHost(host, platformHost);

  if (lookup.kind === "unknown") {
    return null;
  }

  if (lookup.kind === "subdomain") {
    return findActiveJournalBySubdomain(lookup.subdomain);
  }

  if (lookup.kind === "custom_domain") {
    const domain = await adminDb.journalDomain.findFirst({
      where: {
        host: lookup.host,
        verified: true,
        sslStatus: "ACTIVE",
      },
      select: {
        journal: { select: journalSelect },
      },
    });
    return domain?.journal ? toResolvedJournal(domain.journal) : null;
  }

  const primary = getPrimaryJournalSubdomain();
  if (primary) {
    return findActiveJournalBySubdomain(primary);
  }

  return null;
}
