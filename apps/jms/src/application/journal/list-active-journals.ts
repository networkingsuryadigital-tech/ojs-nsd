import "server-only";

import type { ActiveJournalRow } from "@/infrastructure/journal/journal-directory-repository";
import { listActiveJournalsFromDb } from "@/infrastructure/journal/journal-directory-repository";
import { getPlatformHost } from "@/infrastructure/tenancy/platform-config";

export type ActiveJournalListing = {
  id: string;
  name: string;
  subdomain: string;
  issnPrint: string | null;
  issnOnline: string | null;
  publicUrl: string;
};

function buildJournalPublicUrl(row: ActiveJournalRow): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let base: URL;
  try {
    base = new URL(appUrl);
  } catch {
    base = new URL("http://localhost:3000");
  }

  const portSuffix = base.port ? `:${base.port}` : "";

  if (row.primaryCustomHost) {
    return `${base.protocol}//${row.primaryCustomHost}`;
  }

  const platformHost = getPlatformHost();
  const hostWithPort = platformHost.includes(":")
    ? platformHost
    : `${platformHost}${portSuffix}`;

  return `${base.protocol}//${row.subdomain}.${hostWithPort}`;
}

/**
 * Platform directory — cross-tenant read via adminDb.
 * Explicit platform route only; not for tenant-scoped operations.
 */
export async function listActiveJournals(): Promise<ActiveJournalListing[]> {
  const rows = await listActiveJournalsFromDb();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    issnPrint: row.issnPrint,
    issnOnline: row.issnOnline,
    publicUrl: buildJournalPublicUrl(row),
  }));
}
