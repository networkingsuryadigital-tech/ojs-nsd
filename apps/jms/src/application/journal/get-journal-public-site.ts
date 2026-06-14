import "server-only";

import { cache } from "react";

import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import {
  fetchJournalPageBySlug,
  fetchJournalPublicSite,
} from "@/infrastructure/journal/journal-public-repository";

export const getJournalPublicSite = cache(
  async (journalId: string): Promise<JournalPublicSite | null> => {
    return fetchJournalPublicSite(journalId);
  },
);

export const getJournalPageBySlug = cache(
  async (
    journalId: string,
    slug: string,
  ): Promise<{
    journal: JournalPublicSite;
    page: JournalPublicSite["pages"][number];
  } | null> => {
    return fetchJournalPageBySlug(journalId, slug);
  },
);

export type RequestTenantContext =
  | { kind: "platform" }
  | { kind: "tenant"; site: JournalPublicSite };

export async function getRequestTenantContext(): Promise<RequestTenantContext> {
  const { getJournalIdFromRequestHeaders } = await import(
    "@/infrastructure/tenancy/request-tenant"
  );
  const journalId = await getJournalIdFromRequestHeaders();
  if (!journalId) {
    return { kind: "platform" };
  }

  const site = await getJournalPublicSite(journalId);
  if (!site) {
    return { kind: "platform" };
  }

  return { kind: "tenant", site };
}

export async function getJournalPageForCurrentRequest(
  slug: string,
): Promise<{
  journal: JournalPublicSite;
  page: JournalPublicSite["pages"][number];
} | null> {
  const { getJournalIdFromRequestHeaders } = await import(
    "@/infrastructure/tenancy/request-tenant"
  );
  const journalId = await getJournalIdFromRequestHeaders();
  if (!journalId) {
    return null;
  }

  return getJournalPageBySlug(journalId, slug);
}
