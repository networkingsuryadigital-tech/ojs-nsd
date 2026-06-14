import "server-only";

import type { DomainSslStatusValue } from "@/domain/tenancy/custom-domain";
import type { JournalDomainRecord } from "@/domain/tenancy/types";
import {
  updateJournalDomainSslStatus,
} from "@/infrastructure/journal/journal-domain-repository";
import { adminDb } from "@/infrastructure/db/admin-db";
import { toResolvedJournal } from "@/infrastructure/tenancy/platform-config";
import {
  invalidateTenantHostCache,
  warmTenantHostCache,
} from "@/infrastructure/tenancy/tenant-cache";
import {
  createVercelDomainsClient,
  type VercelDomainsClient,
} from "@/infrastructure/vercel/vercel-domains-client";

export type SyncJournalDomainSslResult = {
  domainId: string;
  host: string;
  sslStatus: DomainSslStatusValue;
  changed: boolean;
};

async function warmCacheForActiveDomain(
  domain: JournalDomainRecord,
): Promise<void> {
  const journal = await adminDb.journal.findFirst({
    where: { id: domain.journalId, isActive: true },
    select: { id: true, subdomain: true, name: true, isActive: true },
  });

  const resolved = journal ? toResolvedJournal(journal) : null;
  if (resolved) {
    await warmTenantHostCache([domain.host], resolved);
  }
}

export async function syncJournalDomainSsl(
  domain: JournalDomainRecord,
  vercel: VercelDomainsClient = createVercelDomainsClient(),
): Promise<SyncJournalDomainSslResult> {
  if (!domain.verified) {
    return {
      domainId: domain.id,
      host: domain.host,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  if (domain.sslStatus === "ACTIVE") {
    return {
      domainId: domain.id,
      host: domain.host,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  if (!vercel.isConfigured()) {
    return {
      domainId: domain.id,
      host: domain.host,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  let nextStatus: DomainSslStatusValue;
  try {
    await vercel.addProjectDomain(domain.host);
    nextStatus = await vercel.getSslStatus(domain.host);
  } catch {
    nextStatus = "FAILED";
  }

  if (nextStatus === domain.sslStatus) {
    return {
      domainId: domain.id,
      host: domain.host,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  const updated = await updateJournalDomainSslStatus(domain.id, nextStatus);
  await invalidateTenantHostCache([domain.host]);

  if (updated.sslStatus === "ACTIVE") {
    await warmCacheForActiveDomain(updated);
  }

  return {
    domainId: updated.id,
    host: updated.host,
    sslStatus: updated.sslStatus,
    changed: true,
  };
}
