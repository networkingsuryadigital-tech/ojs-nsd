import { describe, expect, it } from "vitest";

import { parseAuthTrustedOrigins } from "@/lib/auth-trusted-origins";

describe("parseAuthTrustedOrigins", () => {
  it("always includes the primary app URL", () => {
    expect(parseAuthTrustedOrigins("https://ejournal.ptnsd.co.id", undefined)).toEqual(
      ["https://ejournal.ptnsd.co.id"],
    );
  });

  it("adds comma-separated custom-domain origins and strips trailing slashes", () => {
    expect(
      parseAuthTrustedOrigins(
        "https://ejournal.ptnsd.co.id/",
        " https://infomanet.ptnsd.co.id/ ,https://ejournal.ptnsd.co.id",
      ),
    ).toEqual([
      "https://ejournal.ptnsd.co.id",
      "https://infomanet.ptnsd.co.id",
    ]);
  });
});
