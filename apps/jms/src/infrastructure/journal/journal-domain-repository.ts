import "server-only";

import type { DomainSslStatusValue } from "@/domain/tenancy/custom-domain";
import type { JournalDomainRecord } from "@/domain/tenancy/types";
import { adminDb } from "@/infrastructure/db/admin-db";
import { withTenant } from "@/infrastructure/db/with-tenant";

const domainSelect = {
  id: true,
  journalId: true,
  host: true,
  isPrimary: true,
  verified: true,
  sslStatus: true,
  verifyToken: true,
  createdAt: true,
} as const;

function mapDomain(
  row: {
    id: string;
    journalId: string;
    host: string;
    isPrimary: boolean;
    verified: boolean;
    sslStatus: "PENDING" | "ACTIVE" | "FAILED";
    verifyToken: string | null;
    createdAt: Date;
  },
): JournalDomainRecord {
  return {
    id: row.id,
    journalId: row.journalId,
    host: row.host,
    isPrimary: row.isPrimary,
    verified: row.verified,
    sslStatus: row.sslStatus,
    verifyToken: row.verifyToken,
    createdAt: row.createdAt,
  };
}

export async function createJournalDomain(
  journalId: string,
  data: {
    host: string;
    verifyToken: string;
    isPrimary?: boolean;
  },
): Promise<JournalDomainRecord> {
  return withTenant(journalId, async (tx) => {
    const created = await tx.journalDomain.create({
      data: {
        journalId,
        host: data.host,
        verifyToken: data.verifyToken,
        isPrimary: data.isPrimary ?? false,
      },
      select: domainSelect,
    });
    return mapDomain(created);
  });
}

export async function findJournalDomainByHost(
  host: string,
): Promise<JournalDomainRecord | null> {
  const row = await adminDb.journalDomain.findFirst({
    where: { host },
    select: domainSelect,
  });
  return row ? mapDomain(row) : null;
}

export async function findJournalDomainById(
  journalId: string,
  domainId: string,
): Promise<JournalDomainRecord | null> {
  return withTenant(journalId, async (tx) => {
    const row = await tx.journalDomain.findFirst({
      where: { id: domainId, journalId },
      select: domainSelect,
    });
    return row ? mapDomain(row) : null;
  });
}

export async function listPendingJournalDomains(): Promise<JournalDomainRecord[]> {
  const rows = await adminDb.journalDomain.findMany({
    where: {
      OR: [
        { verified: false },
        { verified: true, sslStatus: { in: ["PENDING", "FAILED"] } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: domainSelect,
  });
  return rows.map(mapDomain);
}

export async function updateJournalDomainVerification(
  domainId: string,
  verified: boolean,
): Promise<JournalDomainRecord> {
  const updated = await adminDb.journalDomain.update({
    where: { id: domainId },
    data: { verified },
    select: domainSelect,
  });
  return mapDomain(updated);
}

export async function updateJournalDomainSslStatus(
  domainId: string,
  sslStatus: DomainSslStatusValue,
): Promise<JournalDomainRecord> {
  const updated = await adminDb.journalDomain.update({
    where: { id: domainId },
    data: { sslStatus },
    select: domainSelect,
  });
  return mapDomain(updated);
}

export async function findActiveJournalForDomain(
  host: string,
): Promise<{
  id: string;
  subdomain: string;
  name: string;
  isActive: boolean;
} | null> {
  const domain = await adminDb.journalDomain.findFirst({
    where: {
      host,
      verified: true,
      sslStatus: "ACTIVE",
    },
    select: {
      journal: {
        select: {
          id: true,
          subdomain: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  return domain?.journal ?? null;
}
