import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  signUpEmail,
  signInEmail,
  getSession,
  signOut,
  findAuthUserIdByEmail,
  ensureJmsUserFromAuth,
  resolvePostLoginRedirect,
} = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  findAuthUserIdByEmail: vi.fn(),
  ensureJmsUserFromAuth: vi.fn(),
  resolvePostLoginRedirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail,
      signInEmail,
      getSession,
      signOut,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/infrastructure/identity/user-repository", () => ({
  findAuthUserIdByEmail,
}));

vi.mock("@/application/auth/ensure-jms-user-from-auth", () => ({
  ensureJmsUserFromAuth,
}));

vi.mock("@/application/auth/resolve-post-login-redirect", () => ({
  resolvePostLoginRedirect,
}));

import { registerAuthor } from "@/application/auth/register-author";
import { signInWithPassword } from "@/application/auth/sign-in-with-password";

const jmsUser = {
  id: "user-1",
  authUserId: "auth-1",
  supabaseId: "auth-1",
  email: "penulis@kampus.ac.id",
  name: "Penulis",
};

describe("registerAuthor", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    getSession.mockReset();
    findAuthUserIdByEmail.mockReset();
    ensureJmsUserFromAuth.mockReset();
    resolvePostLoginRedirect.mockReset();
    ensureJmsUserFromAuth.mockResolvedValue(jmsUser);
    resolvePostLoginRedirect.mockResolvedValue("/author/submissions");
  });

  it("creates the JMS profile even when signup session is missing", async () => {
    signUpEmail.mockResolvedValue({ user: { id: "auth-1" } });
    getSession.mockResolvedValue(null);

    const result = await registerAuthor({
      email: "penulis@kampus.ac.id",
      password: "Password123",
      name: "Penulis",
      journalId: "journal-infomanet",
    });

    expect(result.ok).toBe(true);
    expect(ensureJmsUserFromAuth).toHaveBeenCalledWith({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      name: "Penulis",
      journalId: "journal-infomanet",
    });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("falls back to AuthUser lookup when signup returns no user id", async () => {
    signUpEmail.mockResolvedValue({});
    getSession.mockResolvedValue(null);
    findAuthUserIdByEmail.mockResolvedValue("auth-1");

    const result = await registerAuthor({
      email: "penulis@kampus.ac.id",
      password: "Password123",
      name: "Penulis",
      journalId: "journal-infomanet",
    });

    expect(result.ok).toBe(true);
    expect(findAuthUserIdByEmail).toHaveBeenCalledWith("penulis@kampus.ac.id");
    expect(ensureJmsUserFromAuth).toHaveBeenCalled();
  });
});

describe("signInWithPassword", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    signOut.mockReset();
    ensureJmsUserFromAuth.mockReset();
    resolvePostLoginRedirect.mockReset();
    ensureJmsUserFromAuth.mockResolvedValue(jmsUser);
    resolvePostLoginRedirect.mockResolvedValue("/author/submissions");
  });

  it("attaches a missing JMS profile instead of rejecting the login", async () => {
    signInEmail.mockResolvedValue({
      user: {
        id: "auth-1",
        email: "penulis@kampus.ac.id",
        name: "Penulis",
      },
    });

    const result = await signInWithPassword({
      email: "penulis@kampus.ac.id",
      password: "Password123",
      journalId: "journal-infomanet",
    });

    expect(result.ok).toBe(true);
    expect(signOut).not.toHaveBeenCalled();
    expect(ensureJmsUserFromAuth).toHaveBeenCalledWith({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      name: "Penulis",
      journalId: "journal-infomanet",
    });
  });
});
