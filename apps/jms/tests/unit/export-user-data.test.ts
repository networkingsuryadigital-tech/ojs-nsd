import { describe, expect, it, vi } from "vitest";

import { exportUserData } from "@/application/privacy/export-user-data";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import {
  loadUserJournalMembershipsForExport,
  loadUserProfileForExport,
  loadUserSubmissionParticipationsForExport,
} from "@/infrastructure/privacy/user-data-repository";

vi.mock("@/infrastructure/privacy/user-data-repository", () => ({
  loadUserProfileForExport: vi.fn(),
  loadUserJournalMembershipsForExport: vi.fn(),
  loadUserSubmissionParticipationsForExport: vi.fn(),
}));

describe("exportUserData", () => {
  it("rejects exporting another user's data", async () => {
    await expect(
      exportUserData({ userId: "user-a", requesterId: "user-b" }),
    ).rejects.toBeInstanceOf(SubmissionAuthorizationError);
  });

  it("exports own profile and memberships", async () => {
    vi.mocked(loadUserProfileForExport).mockResolvedValue({
      id: "user-a",
      email: "author@example.com",
      name: "Author",
      affiliation: null,
      orcid: null,
      country: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(loadUserJournalMembershipsForExport).mockResolvedValue([]);
    vi.mocked(loadUserSubmissionParticipationsForExport).mockResolvedValue([]);

    const result = await exportUserData({
      userId: "user-a",
      requesterId: "user-a",
    });

    expect(result.profile.id).toBe("user-a");
    expect(result.journalMemberships).toEqual([]);
    expect(result.submissionParticipations).toEqual([]);
  });
});
