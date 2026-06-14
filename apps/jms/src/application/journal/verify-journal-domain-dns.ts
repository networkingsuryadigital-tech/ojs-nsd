import "server-only";

import {
  isCnamePointingToTarget,
  isTxtVerificationMatch,
  txtVerificationHostname,
} from "@/domain/tenancy/custom-domain";
import type {
  JournalDomainRecord,
  VerifyJournalDomainResult,
} from "@/domain/tenancy/types";
import type { DnsResolver } from "@/infrastructure/dns/dns-resolver";
import { createNodeDnsResolver } from "@/infrastructure/dns/dns-resolver";
import {
  findJournalDomainById,
  updateJournalDomainVerification,
} from "@/infrastructure/journal/journal-domain-repository";
import { getCnameTarget } from "@/infrastructure/tenancy/domain-config";
import { invalidateTenantHostCache } from "@/infrastructure/tenancy/tenant-cache";
import { createVercelDomainsClient } from "@/infrastructure/vercel/vercel-domains-client";

async function checkDnsOwnership(
  domain: JournalDomainRecord,
  resolver: DnsResolver,
  cnameTarget: string,
): Promise<boolean> {
  if (!domain.verifyToken) {
    return false;
  }

  const txtRecords = await resolver.resolveTxt(
    txtVerificationHostname(domain.host),
  );
  if (txtRecords && isTxtVerificationMatch(txtRecords, domain.verifyToken)) {
    return true;
  }

  const cnameRecords = await resolver.resolveCname(domain.host);
  if (cnameRecords && isCnamePointingToTarget(cnameRecords, cnameTarget)) {
    return true;
  }

  return false;
}

export async function verifyJournalDomainDns(
  journalId: string,
  domainId: string,
  deps: {
    resolver?: DnsResolver;
    cnameTarget?: string;
  } = {},
): Promise<VerifyJournalDomainResult> {
  const domain = await findJournalDomainById(journalId, domainId);
  if (!domain) {
    throw new Error("Journal domain not found.");
  }

  if (domain.verified) {
    return {
      domainId: domain.id,
      host: domain.host,
      verified: true,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  const resolver = deps.resolver ?? createNodeDnsResolver();
  const cnameTarget = deps.cnameTarget ?? getCnameTarget();
  const dnsVerified = await checkDnsOwnership(domain, resolver, cnameTarget);

  if (!dnsVerified) {
    return {
      domainId: domain.id,
      host: domain.host,
      verified: false,
      sslStatus: domain.sslStatus,
      changed: false,
    };
  }

  const updated = await updateJournalDomainVerification(domain.id, true);
  await invalidateTenantHostCache([domain.host]);

  const vercel = createVercelDomainsClient();
  if (vercel.isConfigured()) {
    try {
      await vercel.addProjectDomain(domain.host);
    } catch {
      // Registration errors are handled during SSL polling.
    }
  }

  return {
    domainId: updated.id,
    host: updated.host,
    verified: updated.verified,
    sslStatus: updated.sslStatus,
    changed: true,
  };
}
