import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
} from "@/domain/tenancy/locale";
import { fetchJournalDefaultLocale } from "@/infrastructure/journal/journal-public-repository";
import { getJournalIdFromRequestHeaders } from "@/infrastructure/tenancy/request-tenant";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const journalId = await getJournalIdFromRequestHeaders();
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
