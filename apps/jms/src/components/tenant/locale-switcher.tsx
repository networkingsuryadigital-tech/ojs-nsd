"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { setLocalePreference } from "@/application/journal/set-locale-preference";
import type { AppLocale } from "@/domain/tenancy/locale";
import { SUPPORTED_LOCALES } from "@/domain/tenancy/locale";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    startTransition(async () => {
      await setLocalePreference(nextLocale);
      router.refresh();
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground/70">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
        disabled={isPending}
        value={locale}
        onChange={(event) => onChange(event.target.value as AppLocale)}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
