import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requirePlatformSuperAdminMock,
  findAuthUserIdByEmailMock,
  journalFindUniqueMock,
  userFindFirstMock,
  userCreateMock,
  userUpdateMock,
  membershipFindUniqueMock,
  membershipUpsertMock,
} = vi.hoisted(() => ({
  requirePlatformSuperAdminMock: vi.fn(),
  findAuthUserIdByEmailMock: vi.fn(),
  journalFindUniqueMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  membershipUpsertMock: vi.fn(),
}));

vi.mock("@/application/identity/require-platform-super-admin", () => ({
  requirePlatformSuperAdmin: requirePlatformSuperAdminMock,
}));

vi.mock("@/infrastructure/auth/seed-auth-user", () => ({
  findAuthUserIdByEmail: findAuthUserIdByEmailMock,
}));

vi.mock("@/infrastructure/db/admin-db", () => ({
  adminDb: {
    journal: { findUnique: journalFindUniqueMock },
    user: {
      findFirst: userFindFirstMock,
      create: userCreateMock,
      update: userUpdateMock,
    },
    journalMembership: {
      findUnique: membershipFindUniqueMock,
      upsert: membershipUpsertMock,
    },
  },
}));

import { grantJournalRolesAsPlatformAdmin } from "@/application/admin/grant-journal-roles";

describe("grantJournalRolesAsPlatformAdmin", () => {
  beforeEach(() => {
    requirePlatformSuperAdminMock.mockReset();
    findAuthUserIdByEmailMock.mockReset();
    journalFindUniqueMock.mockReset();
    userFindFirstMock.mockReset();
    userCreateMock.mockReset();
    userUpdateMock.mockReset();
    membershipFindUniqueMock.mockReset();
    membershipUpsertMock.mockReset();
    requirePlatformSuperAdminMock.mockResolvedValue({ id: "super-1" });
    journalFindUniqueMock.mockResolvedValue({
      id: "journal-1",
      isActive: true,
      name: "NSD",
    });
  });

  it("returns an error when the email has no Prisma or Auth user", async () => {
    userFindFirstMock.mockResolvedValue(null);
    findAuthUserIdByEmailMock.mockResolvedValue(null);
    const result = await grantJournalRolesAsPlatformAdmin({
      subdomain: "nsd",
      email: "baru@example.com",
      roles: ["JOURNAL_ADMIN"],
      merge: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/daftar/i);
    }
    expect(membershipUpsertMock).not.toHaveBeenCalled();
  });

  it("grants JOURNAL_ADMIN on an existing Prisma user", async () => {
    userFindFirstMock.mockResolvedValue({
      id: "user-1",
      supabaseId: "auth-1",
      name: "Editor",
    });
    findAuthUserIdByEmailMock.mockResolvedValue("auth-1");
    membershipFindUniqueMock.mockResolvedValue(null);
    membershipUpsertMock.mockResolvedValue({});

    const result = await grantJournalRolesAsPlatformAdmin({
      subdomain: "nsd",
      email: "editor@example.com",
      roles: ["JOURNAL_ADMIN"],
      merge: true,
    });

    expect(result).toEqual({
      ok: true,
      email: "editor@example.com",
      roles: ["JOURNAL_ADMIN"],
      action: "created",
    });
    expect(membershipUpsertMock).toHaveBeenCalledOnce();
  });
});
