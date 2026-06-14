import { describe, expect, it } from "vitest";

import { isProtectedPath, isAuthExemptPath } from "@/domain/auth/protected-paths";

describe("protected-paths", () => {
  it("marks editorial, author, reviewer, and notifications as protected", () => {
    expect(isProtectedPath("/editorial/dashboard")).toBe(true);
    expect(isProtectedPath("/author/submissions")).toBe(true);
    expect(isProtectedPath("/reviewer/assignments")).toBe(true);
    expect(isProtectedPath("/notifications")).toBe(true);
    expect(isProtectedPath("/api/editorial/oai/validate")).toBe(true);
    expect(isProtectedPath("/privacy/account")).toBe(true);
    expect(isProtectedPath("/api/privacy/export")).toBe(true);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/issues")).toBe(false);
  });

  it("exempts login page", () => {
    expect(isAuthExemptPath("/login")).toBe(true);
    expect(isAuthExemptPath("/editorial/dashboard")).toBe(false);
  });
});
