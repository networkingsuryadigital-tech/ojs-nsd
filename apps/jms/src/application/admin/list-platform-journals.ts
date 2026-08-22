import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";

export type PlatformJournalRow = {
  id: string;
  name: string;
  subdomain: string;
  issnOnline: string | null;
  isActive: boolean;
  oaiRepoName: string | null;
  domainCount: number;
};

export async function listPlatformJournals(): Promise<PlatformJournalRow[]> {
  const journals = await adminDb.journal.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
      issnOnline: true,
      isActive: true,
      oaiRepoName: true,
      _count: { select: { domains: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    subdomain: journal.subdomain,
    issnOnline: journal.issnOnline,
    isActive: journal.isActive,
    oaiRepoName: journal.oaiRepoName,
    domainCount: journal._count.domains,
  }));
}
