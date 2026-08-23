import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/admin-db", () => ({
  adminDb: {
    user: { findUnique: findUniqueMock },
  },
}));

import { isPlatformSuperAdmin } from "@/application/identity/is-platform-super-admin";

describe("isPlatformSuperAdmin", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns true for SUPER_ADMIN", async () => {
    findUniqueMock.mockResolvedValue({ platformRole: "SUPER_ADMIN" });
    await expect(isPlatformSuperAdmin("user-1")).resolves.toBe(true);
  });

  it("returns false for a regular user", async () => {
    findUniqueMock.mockResolvedValue({ platformRole: "USER" });
    await expect(isPlatformSuperAdmin("user-1")).resolves.toBe(false);
  });

  it("returns false when the user is missing", async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(isPlatformSuperAdmin("missing")).resolves.toBe(false);
  });
});
