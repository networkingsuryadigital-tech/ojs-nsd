import { describe, expect, it, vi, beforeEach } from "vitest";

import { isSafeInternalPath, buildLoginRedirectUrl } from "@/application/auth/login-redirect";
import { resolvePostLoginRedirect } from "@/application/auth/resolve-post-login-redirect";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";

vi.mock("@/application/identity/resolve-journal-roles", () => ({
  resolveJournalRoles: vi.fn(),
}));

describe("login-redirect", () => {
  it("rejects external and login redirect paths", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("/login")).toBe(false);
    expect(isSafeInternalPath("/editorial/dashboard")).toBe(true);
  });

  it("builds login url with next param", () => {
    expect(buildLoginRedirectUrl("/editorial/dashboard")).toBe(
      "/login?next=%2Feditorial%2Fdashboard",
    );
    expect(buildLoginRedirectUrl()).toBe("/login");
  });
});

describe("resolvePostLoginRedirect", () => {
  beforeEach(() => {
    vi.mocked(resolveJournalRoles).mockReset();
  });

  it("prefers safe next path", async () => {
    const result = await resolvePostLoginRedirect({
      userId: "user-1",
      journalId: "journal-1",
      nextPath: "/notifications",
    });
    expect(result).toBe("/notifications");
    expect(resolveJournalRoles).not.toHaveBeenCalled();
  });

  it("redirects editorial roles to dashboard", async () => {
    vi.mocked(resolveJournalRoles).mockResolvedValue(["SECTION_EDITOR"]);
    const result = await resolvePostLoginRedirect({
      userId: "user-1",
      journalId: "journal-1",
    });
    expect(result).toBe("/editorial/dashboard");
  });

  it("redirects authors to author portal", async () => {
    vi.mocked(resolveJournalRoles).mockResolvedValue(["AUTHOR"]);
    const result = await resolvePostLoginRedirect({
      userId: "user-1",
      journalId: "journal-1",
    });
    expect(result).toBe("/author/submissions");
  });

  it("redirects reviewers to reviewer dashboard", async () => {
    vi.mocked(resolveJournalRoles).mockResolvedValue(["REVIEWER"]);
    const result = await resolvePostLoginRedirect({
      userId: "user-1",
      journalId: "journal-1",
    });
    expect(result).toBe("/reviewer/assignments");
  });

  it("falls back to home without journal context", async () => {
    const result = await resolvePostLoginRedirect({
      userId: "user-1",
      journalId: null,
    });
    expect(result).toBe("/");
  });
});
