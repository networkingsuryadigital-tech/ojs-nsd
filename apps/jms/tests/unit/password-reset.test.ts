import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, resetPasswordMock, changePasswordMock, requestPasswordResetMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    changePasswordMock: vi.fn(),
    requestPasswordResetMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
      resetPassword: resetPasswordMock,
      changePassword: changePasswordMock,
      requestPasswordReset: requestPasswordResetMock,
      signOut: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/application/auth/request-origin", () => ({
  resolveRequestOrigin: vi.fn().mockResolvedValue("https://ejournal.ptnsd.co.id"),
}));

import { requestPasswordReset } from "@/application/auth/request-password-reset";
import { updatePassword } from "@/application/auth/update-password";

describe("requestPasswordReset", () => {
  beforeEach(() => {
    requestPasswordResetMock.mockReset();
    requestPasswordResetMock.mockResolvedValue(undefined);
  });

  it("rejects invalid email", async () => {
    const result = await requestPasswordReset({ email: "bukan-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/email/i);
    }
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns generic success and calls Better Auth with redirect URL", async () => {
    const result = await requestPasswordReset({ email: "admin@ptnsd.co.id" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/tautan reset/i);
    }
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      body: {
        email: "admin@ptnsd.co.id",
        redirectTo: "https://ejournal.ptnsd.co.id/login/update-password",
      },
    });
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    resetPasswordMock.mockReset();
    changePasswordMock.mockReset();
    resetPasswordMock.mockResolvedValue(undefined);
    changePasswordMock.mockResolvedValue(undefined);
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
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("fails without token or recovery session", async () => {
    getSessionMock.mockResolvedValue(null);
    const result = await updatePassword({
      password: "PasswordBaru1",
      confirmPassword: "PasswordBaru1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sesi reset/i);
    }
  });

  it("updates password with reset token", async () => {
    const result = await updatePassword({
      password: "PasswordBaru1",
      confirmPassword: "PasswordBaru1",
      token: "reset-token-abc",
    });
    expect(result.ok).toBe(true);
    expect(resetPasswordMock).toHaveBeenCalledWith({
      body: { newPassword: "PasswordBaru1", token: "reset-token-abc" },
    });
  });

  it("updates password when session exists", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "auth-1" } });
    const result = await updatePassword({
      password: "PasswordBaru1",
      confirmPassword: "PasswordBaru1",
    });
    expect(result.ok).toBe(true);
    expect(changePasswordMock).toHaveBeenCalled();
  });
});
