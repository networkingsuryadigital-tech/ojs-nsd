import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";
import { parseTenantHost } from "@/domain/tenancy/host";
import type { ResolvedJournal } from "@/domain/tenancy/types";
import { getPlatformHost, toResolvedJournal } from "./platform-config";

export async function lookupJournalByHostFromDb(
  host: string,
  platformHost: string = getPlatformHost(),
): Promise<ResolvedJournal | null> {
  const lookup = parseTenantHost(host, platformHost);

  if (lookup.kind === "platform_admin" || lookup.kind === "unknown") {
    return null;
  }

  if (lookup.kind === "subdomain") {
    const journal = await adminDb.journal.findFirst({
      where: {
        subdomain: lookup.subdomain,
        isActive: true,
      },
      select: { id: true, subdomain: true, name: true, isActive: true },
    });
    return journal ? toResolvedJournal(journal) : null;
  }

  const domain = await adminDb.journalDomain.findFirst({
    where: {
      host: lookup.host,
      verified: true,
      sslStatus: "ACTIVE",
    },
    select: {
      journal: {
        select: { id: true, subdomain: true, name: true, isActive: true },
      },
    },
  });

  return domain?.journal ? toResolvedJournal(domain.journal) : null;
}
