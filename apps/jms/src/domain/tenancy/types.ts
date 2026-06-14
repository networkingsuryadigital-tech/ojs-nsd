/** Pure domain types — no I/O imports. */

import type { DomainDnsInstructions } from "./custom-domain";

export type JournalId = string & { readonly __brand: "JournalId" };

export function asJournalId(id: string): JournalId {
  return id as JournalId;
}

export type ResolvedJournal = {
  id: string;
  subdomain: string;
  name: string;
};

export type ProvisionJournalInput = {
  name: string;
  subdomain: string;
  adminUserId: string;
  publisher?: string;
  issnPrint?: string;
  issnOnline?: string;
};

export type ProvisionJournalResult = {
  journalId: string;
  subdomain: string;
  membershipId: string;
  themeId: string;
  pageIds: string[];
};

export type JournalDomainRecord = {
  id: string;
  journalId: string;
  host: string;
  isPrimary: boolean;
  verified: boolean;
  sslStatus: "PENDING" | "ACTIVE" | "FAILED";
  verifyToken: string | null;
  createdAt: Date;
};

export type AddJournalDomainInput = {
  journalId: string;
  host: string;
  isPrimary?: boolean;
};

export type AddJournalDomainResult = {
  domainId: string;
  host: string;
  verifyToken: string;
  instructions: DomainDnsInstructions;
};

export type VerifyJournalDomainResult = {
  domainId: string;
  host: string;
  verified: boolean;
  sslStatus: JournalDomainRecord["sslStatus"];
  changed: boolean;
};

export type ProcessJournalDomainsResult = {
  checked: number;
  dnsVerified: number;
  sslUpdated: number;
  failed: number;
};
