import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteUserAccount } from "@/application/privacy/delete-user-account";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { anonymizedUserEmail } from "@/domain/privacy/anonymization";
import {
  anonymizeUserRecord,
  loadUserForDeletion,
} from "@/infrastructure/privacy/user-deletion-repository";

const { deleteAuthUserMock } = vi.hoisted(() => ({
  deleteAuthUserMock: vi.fn(),
}));

vi.mock("@/infrastructure/privacy/user-deletion-repository", () => ({
  loadUserForDeletion: vi.fn(),
  anonymizeUserRecord: vi.fn(),
}));

vi.mock("@/infrastructure/db/prisma", () => ({
  prisma: {
    authUser: {
      delete: deleteAuthUserMock,
    },
  },
}));

describe("deleteUserAccount", () => {
  beforeEach(() => {
    deleteAuthUserMock.mockReset();
    deleteAuthUserMock.mockResolvedValue({});
    vi.mocked(anonymizeUserRecord).mockClear();
    vi.mocked(anonymizeUserRecord).mockResolvedValue(undefined);
  });

  it("rejects deleting another user's account", async () => {
    await expect(
      deleteUserAccount({ userId: "user-a", requesterId: "user-b" }),
    ).rejects.toBeInstanceOf(SubmissionAuthorizationError);
  });

  it("anonymizes DB then deletes auth user on first call", async () => {
    vi.mocked(loadUserForDeletion).mockResolvedValue({
      id: "user-a",
      supabaseId: "auth-a",
      email: "author@example.com",
    });

    const result = await deleteUserAccount({
      userId: "user-a",
      requesterId: "user-a",
    });

    expect(anonymizeUserRecord).toHaveBeenCalledWith("user-a");
    expect(deleteAuthUserMock).toHaveBeenCalledWith({ where: { id: "auth-a" } });
    expect(result).toEqual({ deleted: true, anonymizedUserId: "user-a" });
  });

  it("is idempotent when DB already anonymized but auth still exists", async () => {
    vi.mocked(loadUserForDeletion).mockResolvedValue({
      id: "user-a",
      supabaseId: "auth-a",
      email: anonymizedUserEmail("user-a"),
    });

    const result = await deleteUserAccount({
      userId: "user-a",
      requesterId: "user-a",
    });

    expect(anonymizeUserRecord).not.toHaveBeenCalled();
    expect(deleteAuthUserMock).toHaveBeenCalledWith({ where: { id: "auth-a" } });
    expect(result).toEqual({ deleted: true, anonymizedUserId: "user-a" });
  });
});
