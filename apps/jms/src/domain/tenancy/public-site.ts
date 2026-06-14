import type { AppLocale } from "./locale";

export type JournalPageView = {
  slug: string;
  title: string;
  content: string;
};

export type JournalThemeView = {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  locale: AppLocale;
};

export type JournalPublicSite = {
  journalId: string;
  name: string;
  subdomain: string;
  publisher: string | null;
  issnPrint: string | null;
  issnOnline: string | null;
  theme: JournalThemeView;
  pages: JournalPageView[];
};
