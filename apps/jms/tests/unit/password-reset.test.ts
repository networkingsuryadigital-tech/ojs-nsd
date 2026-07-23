import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, updateUserMock, resetPasswordMock, getServerSupabaseMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    updateUserMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    getServerSupabaseMock: vi.fn(),
  }));

vi.mock("@/infrastructure/auth/supabase", () => ({
  getServerSupabase: getServerSupabaseMock,
}));

vi.mock("@/application/auth/request-origin", () => ({
  resolveRequestOrigin: vi.fn().mockResolvedValue("https://ejournal.ptnsd.co.id"),
}));

import { requestPasswordReset } from "@/application/auth/request-password-reset";
import { updatePassword } from "@/application/auth/update-password";

describe("requestPasswordReset", () => {
  beforeEach(() => {
    getServerSupabaseMock.mockReset();
    resetPasswordMock.mockReset();
    getServerSupabaseMock.mockResolvedValue({
      auth: { resetPasswordForEmail: resetPasswordMock },
    });
    resetPasswordMock.mockResolvedValue({ error: null });
  });

  it("rejects invalid email", async () => {
    const result = await requestPasswordReset({ email: "bukan-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/email/i);
    }
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("returns generic success and calls Supabase with callback redirect", async () => {
    const result = await requestPasswordReset({ email: "admin@ptnsd.co.id" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/tautan reset/i);
    }
    expect(resetPasswordMock).toHaveBeenCalledWith(
      "admin@ptnsd.co.id",
      expect.objectContaining({
        redirectTo: expect.stringContaining(
          "/auth/callback?next=%2Flogin%2Fupdate-password",
        ),
      }),
    );
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    getServerSupabaseMock.mockReset();
    getUserMock.mockReset();
    updateUserMock.mockReset();
    getServerSupabaseMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        updateUser: updateUserMock,
      },
    });
  });

  it("requires matching passwords of min length 8", async () => {
    const short = await updatePassword({
      password: "short",
      confirmPassword: "short",
    });
    expect(short.ok).toBe(false);

    const mismatch = await updatePassword({
      password: "panjangsekali1",
      confirmPassword: "panjangsekali2",
    });
    expect(mismatch.ok).toBe(false);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("fails without recovery session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updatePassword({
      password: "PasswordBaru1",
      confirmPassword: "PasswordBaru1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sesi reset/i);
    }
  });

  it("updates password when session exists", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "auth-1" } } });
    updateUserMock.mockResolvedValue({ error: null });
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    getServerSupabaseMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        updateUser: updateUserMock,
        signOut: signOutMock,
      },
    });

    const result = await updatePassword({
      password: "PasswordBaru1",
      confirmPassword: "PasswordBaru1",
    });
    expect(result.ok).toBe(true);
    expect(updateUserMock).toHaveBeenCalledWith({ password: "PasswordBaru1" });
    expect(signOutMock).toHaveBeenCalled();
  });
});
