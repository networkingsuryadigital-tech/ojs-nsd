import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedUserMock, findUniqueMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: vi.fn(),
}));

vi.mock("@/application/identity/require-authenticated-user", () => ({
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}));

vi.mock("@/infrastructure/db/admin-db", () => ({
  adminDb: {
    user: { findUnique: findUniqueMock },
  },
}));

import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";

describe("requirePlatformSuperAdmin", () => {
  beforeEach(() => {
    requireAuthenticatedUserMock.mockReset();
    findUniqueMock.mockReset();
    requireAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
    });
  });

  it("returns the user when platformRole is SUPER_ADMIN", async () => {
    findUniqueMock.mockResolvedValue({ platformRole: "SUPER_ADMIN", email: "a@b.c" });
    const user = await requirePlatformSuperAdmin();
    expect(user.id).toBe("user-1");
  });

  it("notFound when the user is not SUPER_ADMIN", async () => {
    findUniqueMock.mockResolvedValue({ platformRole: "USER", email: "a@b.c" });
    await expect(requirePlatformSuperAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
