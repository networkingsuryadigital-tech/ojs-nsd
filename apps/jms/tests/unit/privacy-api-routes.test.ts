import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveSessionUser } from "@/application/identity/resolve-session-user";
import { deleteUserAccount } from "@/application/privacy/delete-user-account";
import { downloadUserDataJson } from "@/application/privacy/export-user-data";
import { DELETE as deleteAccountRoute } from "@/app/api/privacy/account/route";
import { GET as exportRoute } from "@/app/api/privacy/export/route";

vi.mock("@/application/identity/resolve-session-user", () => ({
  resolveSessionUser: vi.fn(),
}));

vi.mock("@/application/privacy/delete-user-account", () => ({
  deleteUserAccount: vi.fn(),
}));

vi.mock("@/application/privacy/export-user-data", () => ({
  downloadUserDataJson: vi.fn(),
}));

describe("privacy API routes", () => {
  beforeEach(() => {
    vi.mocked(resolveSessionUser).mockReset();
    vi.mocked(deleteUserAccount).mockReset();
    vi.mocked(downloadUserDataJson).mockReset();
  });

  it("DELETE /api/privacy/account returns 401 without session", async () => {
    vi.mocked(resolveSessionUser).mockResolvedValue(null);

    const response = await deleteAccountRoute();
    expect(response.status).toBe(401);
  });

  it("GET /api/privacy/export returns 401 without session", async () => {
    vi.mocked(resolveSessionUser).mockResolvedValue(null);

    const response = await exportRoute();
    expect(response.status).toBe(401);
  });

  it("DELETE /api/privacy/account uses session user id only", async () => {
    vi.mocked(resolveSessionUser).mockResolvedValue({
      id: "user-a",
      supabaseId: "supabase-a",
      email: "author@example.com",
      name: null,
    });
    vi.mocked(deleteUserAccount).mockResolvedValue({
      deleted: true,
      anonymizedUserId: "user-a",
    });

    const response = await deleteAccountRoute();
    expect(response.status).toBe(200);
    expect(deleteUserAccount).toHaveBeenCalledWith({
      userId: "user-a",
      requesterId: "user-a",
    });
  });

  it("GET /api/privacy/export uses session user id only", async () => {
    vi.mocked(resolveSessionUser).mockResolvedValue({
      id: "user-a",
      supabaseId: "supabase-a",
      email: "author@example.com",
      name: null,
    });
    vi.mocked(downloadUserDataJson).mockResolvedValue({
      filename: "user-data-user-a.json",
      body: "{}",
    });

    const response = await exportRoute();
    expect(response.status).toBe(200);
    expect(downloadUserDataJson).toHaveBeenCalledWith({
      userId: "user-a",
      requesterId: "user-a",
    });
  });
});
