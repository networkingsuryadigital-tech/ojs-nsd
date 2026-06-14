"use server";

import { cookies } from "next/headers";

import {
  type AppLocale,
  LOCALE_COOKIE,
  isAppLocale,
} from "@/domain/tenancy/locale";

const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export async function setLocalePreference(locale: AppLocale): Promise<void> {
  if (!isAppLocale(locale)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_MAX_AGE,
    sameSite: "lax",
  });
}
