"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { setLocalePreference } from "@/application/journal/set-locale-preference";
import type { AppLocale } from "@/domain/tenancy/locale";
import { SUPPORTED_LOCALES } from "@/domain/tenancy/locale";

type LocaleSwitcherProps = {
  compact?: boolean;
};

export function LocaleSwitcher({ compact = false }: LocaleSwitcherProps) {
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
    <label className="inline-flex items-center text-sm text-muted-foreground">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        className="h-8 rounded-md border-0 bg-transparent px-1.5 text-sm text-foreground/80 hover:bg-muted disabled:opacity-50"
        disabled={isPending}
        value={locale}
        onChange={(event) => onChange(event.target.value as AppLocale)}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {compact ? code.toUpperCase() : t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
