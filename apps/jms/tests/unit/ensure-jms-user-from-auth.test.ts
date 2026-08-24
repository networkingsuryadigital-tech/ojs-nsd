import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUserByAuthUserId,
  findUserByEmail,
  linkAppUserToAuth,
  createAppUserFromAuth,
  ensureAuthorMembership,
} = vi.hoisted(() => ({
  findUserByAuthUserId: vi.fn(),
  findUserByEmail: vi.fn(),
  linkAppUserToAuth: vi.fn(),
  createAppUserFromAuth: vi.fn(),
  ensureAuthorMembership: vi.fn(),
}));

vi.mock("@/infrastructure/identity/user-repository", () => ({
  findUserByAuthUserId,
  findUserByEmail,
  linkAppUserToAuth,
  createAppUserFromAuth,
  ensureAuthorMembership,
}));

import { ensureJmsUserFromAuth } from "@/application/auth/ensure-jms-user-from-auth";

const linkedUser = {
  id: "user-1",
  authUserId: "auth-1",
  supabaseId: "auth-1",
  email: "penulis@kampus.ac.id",
  name: "Penulis",
};

describe("ensureJmsUserFromAuth", () => {
  beforeEach(() => {
    findUserByAuthUserId.mockReset();
    findUserByEmail.mockReset();
    linkAppUserToAuth.mockReset();
    createAppUserFromAuth.mockReset();
    ensureAuthorMembership.mockReset();
    ensureAuthorMembership.mockResolvedValue(undefined);
  });

  it("reuses a user already linked to the auth id", async () => {
    findUserByAuthUserId.mockResolvedValue(linkedUser);

    const result = await ensureJmsUserFromAuth({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      name: "Penulis",
      journalId: "journal-1",
    });

    expect(result.id).toBe("user-1");
    expect(createAppUserFromAuth).not.toHaveBeenCalled();
    expect(ensureAuthorMembership).toHaveBeenCalledWith("journal-1", "user-1");
  });

  it("links an existing email when auth id is new", async () => {
    findUserByAuthUserId.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue({
      ...linkedUser,
      supabaseId: "old-auth",
      authUserId: "old-auth",
    });
    linkAppUserToAuth.mockResolvedValue(linkedUser);

    await ensureJmsUserFromAuth({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      journalId: null,
    });

    expect(linkAppUserToAuth).toHaveBeenCalledWith({
      userId: "user-1",
      authUserId: "auth-1",
      name: "Penulis",
    });
    expect(createAppUserFromAuth).not.toHaveBeenCalled();
    expect(ensureAuthorMembership).not.toHaveBeenCalled();
  });

  it("creates a JMS user when auth exists without a profile", async () => {
    findUserByAuthUserId.mockResolvedValue(null);
    findUserByEmail.mockResolvedValue(null);
    createAppUserFromAuth.mockResolvedValue(linkedUser);

    await ensureJmsUserFromAuth({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      name: "Penulis",
      journalId: "journal-1",
    });

    expect(createAppUserFromAuth).toHaveBeenCalledWith({
      authUserId: "auth-1",
      email: "penulis@kampus.ac.id",
      name: "Penulis",
    });
    expect(ensureAuthorMembership).toHaveBeenCalledWith("journal-1", "user-1");
  });
});
