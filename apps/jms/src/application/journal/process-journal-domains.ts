import "server-only";

import type { ProcessJournalDomainsResult } from "@/domain/tenancy/types";
import type { DnsResolver } from "@/infrastructure/dns/dns-resolver";
import { createNodeDnsResolver } from "@/infrastructure/dns/dns-resolver";
import { listPendingJournalDomains } from "@/infrastructure/journal/journal-domain-repository";
import { verifyJournalDomainDns } from "./verify-journal-domain-dns";
import { syncJournalDomainSsl } from "./sync-journal-domain-ssl";
import {
  createVercelDomainsClient,
  type VercelDomainsClient,
} from "@/infrastructure/vercel/vercel-domains-client";

export async function processJournalDomains(
  deps: {
    resolver?: DnsResolver;
    vercel?: VercelDomainsClient;
  } = {},
): Promise<ProcessJournalDomainsResult> {
  const resolver = deps.resolver ?? createNodeDnsResolver();
  const vercel = deps.vercel ?? createVercelDomainsClient();
  const pending = await listPendingJournalDomains();

  let dnsVerified = 0;
  let sslUpdated = 0;
  let failed = 0;

  for (const domain of pending) {
    try {
      if (!domain.verified) {
        const result = await verifyJournalDomainDns(domain.journalId, domain.id, {
          resolver,
        });
        if (result.changed && result.verified) {
          dnsVerified += 1;
        }
        continue;
      }

      const sslResult = await syncJournalDomainSsl(domain, vercel);
      if (sslResult.changed) {
        sslUpdated += 1;
        if (sslResult.sslStatus === "FAILED") {
          failed += 1;
        }
      }
    } catch {
      failed += 1;
    }
  }

  return {
    checked: pending.length,
    dnsVerified,
    sslUpdated,
    failed,
  };
}
