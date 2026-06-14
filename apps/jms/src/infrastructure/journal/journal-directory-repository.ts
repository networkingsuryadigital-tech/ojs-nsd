import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";

export type ActiveJournalRow = {
  id: string;
  name: string;
  subdomain: string;
  issnPrint: string | null;
  issnOnline: string | null;
  primaryCustomHost: string | null;
};

/**
 * Platform directory — cross-tenant query via adminDb (BYPASSRLS).
 * Only for explicit platform-level listing; never use for tenant-scoped mutations.
 */
export async function listActiveJournalsFromDb(): Promise<ActiveJournalRow[]> {
  const journals = await adminDb.journal.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subdomain: true,
      issnPrint: true,
      issnOnline: true,
      domains: {
        where: {
          isPrimary: true,
          verified: true,
          sslStatus: "ACTIVE",
        },
        select: { host: true },
        take: 1,
      },
    },
  });

  return journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    subdomain: journal.subdomain,
    issnPrint: journal.issnPrint,
    issnOnline: journal.issnOnline,
    primaryCustomHost: journal.domains[0]?.host ?? null,
  }));
}
