import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
} from "@/domain/tenancy/locale";
import { JOURNAL_ID_HEADER } from "@/domain/tenancy/request-headers";
import { fetchJournalDefaultLocale } from "@/infrastructure/journal/journal-public-repository";

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const journalId = headerStore.get(JOURNAL_ID_HEADER)?.trim();
  const journalDefault = journalId
    ? await fetchJournalDefaultLocale(journalId)
    : DEFAULT_LOCALE;

  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    journalDefault,
  );

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
