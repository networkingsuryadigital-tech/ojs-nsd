import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  isAppLocale,
  resolveLocale,
} from "@/domain/tenancy/locale";

describe("resolveLocale", () => {
  it("prefers cookie preference over journal default", () => {
    expect(resolveLocale("en", "id")).toBe("en");
    expect(resolveLocale("id", "en")).toBe("id");
  });

  it("falls back to journal default when preference invalid", () => {
    expect(resolveLocale("fr", "en")).toBe("en");
    expect(resolveLocale(undefined, "en")).toBe("en");
  });

  it("uses platform default when both missing", () => {
    expect(resolveLocale(undefined, undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("xx", "yy")).toBe(DEFAULT_LOCALE);
  });

  it("validates supported locales", () => {
    expect(isAppLocale("id")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("fr")).toBe(false);
  });
});
