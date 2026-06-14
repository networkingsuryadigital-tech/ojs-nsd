import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteUserAccount } from "@/application/privacy/delete-user-account";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { anonymizedUserEmail } from "@/domain/privacy/anonymization";
import {
  anonymizeUserRecord,
  loadUserForDeletion,
} from "@/infrastructure/privacy/user-deletion-repository";

const deleteUserMock = vi.fn();

vi.mock("@/infrastructure/privacy/user-deletion-repository", () => ({
  loadUserForDeletion: vi.fn(),
  anonymizeUserRecord: vi.fn(),
}));

vi.mock("@/infrastructure/auth/supabase", () => ({
  getAdminSupabase: () => ({
    auth: {
      admin: {
        deleteUser: deleteUserMock,
      },
    },
  }),
}));

describe("deleteUserAccount", () => {
  beforeEach(() => {
    deleteUserMock.mockReset();
    deleteUserMock.mockResolvedValue({ error: null });
    vi.mocked(anonymizeUserRecord).mockClear();
    vi.mocked(anonymizeUserRecord).mockResolvedValue(undefined);
  });

  it("rejects deleting another user's account", async () => {
    await expect(
      deleteUserAccount({ userId: "user-a", requesterId: "user-b" }),
    ).rejects.toBeInstanceOf(SubmissionAuthorizationError);
  });

  it("anonymizes DB then deletes Supabase auth on first call", async () => {
    vi.mocked(loadUserForDeletion).mockResolvedValue({
      id: "user-a",
      supabaseId: "supabase-a",
      email: "author@example.com",
    });

    const result = await deleteUserAccount({
      userId: "user-a",
      requesterId: "user-a",
    });

    expect(anonymizeUserRecord).toHaveBeenCalledWith("user-a");
    expect(deleteUserMock).toHaveBeenCalledWith("supabase-a");
    expect(result).toEqual({ deleted: true, anonymizedUserId: "user-a" });
  });

  it("is idempotent when DB already anonymized but auth still exists", async () => {
    vi.mocked(loadUserForDeletion).mockResolvedValue({
      id: "user-a",
      supabaseId: "supabase-a",
      email: anonymizedUserEmail("user-a"),
    });

    const result = await deleteUserAccount({
      userId: "user-a",
      requesterId: "user-a",
    });

    expect(anonymizeUserRecord).not.toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith("supabase-a");
    expect(result).toEqual({ deleted: true, anonymizedUserId: "user-a" });
  });
});
