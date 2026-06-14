import { describe, expect, it } from "vitest";

import { buildThemeCssVariables } from "@/domain/tenancy/theme-styles";

describe("buildThemeCssVariables", () => {
  it("maps journal theme to CSS custom properties", () => {
    expect(
      buildThemeCssVariables({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        fontFamily: "Georgia, serif",
      }),
    ).toEqual({
      "--journal-primary": "#112233",
      "--journal-secondary": "#445566",
      "--journal-font": "Georgia, serif",
    });
  });

  it("applies fallbacks for empty colors", () => {
    expect(
      buildThemeCssVariables({
        primaryColor: null,
        secondaryColor: "  ",
        fontFamily: null,
      }),
    ).toEqual({
      "--journal-primary": "#1d4ed8",
      "--journal-secondary": "#64748b",
    });
  });
});
