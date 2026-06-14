import "server-only";

import type { AppLocale } from "@/domain/tenancy/locale";
import { isAppLocale } from "@/domain/tenancy/locale";
import type { JournalPublicSite } from "@/domain/tenancy/public-site";
import { withTenant } from "@/infrastructure/db/with-tenant";

function mapTheme(
  theme: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    fontFamily: string | null;
    locale: string;
  },
): JournalPublicSite["theme"] {
  return {
    logoUrl: theme.logoUrl,
    faviconUrl: theme.faviconUrl,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    fontFamily: theme.fontFamily,
    locale: isAppLocale(theme.locale) ? theme.locale : "id",
  };
}

export async function fetchJournalPublicSite(
  journalId: string,
): Promise<JournalPublicSite | null> {
  return withTenant(journalId, async (tx) => {
    const journal = await tx.journal.findFirst({
      where: { id: journalId, isActive: true },
      select: {
        id: true,
        name: true,
        subdomain: true,
        publisher: true,
        issnPrint: true,
        issnOnline: true,
        theme: true,
        pages: {
          where: { isPublished: true },
          orderBy: { slug: "asc" },
          select: {
            slug: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!journal?.theme) {
      return null;
    }

    return {
      journalId: journal.id,
      name: journal.name,
      subdomain: journal.subdomain,
      publisher: journal.publisher,
      issnPrint: journal.issnPrint,
      issnOnline: journal.issnOnline,
      theme: mapTheme(journal.theme),
      pages: journal.pages,
    };
  });
}

export async function fetchJournalPageBySlug(
  journalId: string,
  slug: string,
): Promise<{ journal: JournalPublicSite; page: JournalPublicSite["pages"][number] } | null> {
  const site = await fetchJournalPublicSite(journalId);
  if (!site) {
    return null;
  }

  const page = site.pages.find((entry) => entry.slug === slug);
  if (!page) {
    return null;
  }

  return { journal: site, page };
}

export async function fetchJournalDefaultLocale(
  journalId: string,
): Promise<AppLocale> {
  return withTenant(journalId, async (tx) => {
    const theme = await tx.journalTheme.findUnique({
      where: { journalId },
      select: { locale: true },
    });
    if (theme && isAppLocale(theme.locale)) {
      return theme.locale;
    }
    return "id";
  });
}
