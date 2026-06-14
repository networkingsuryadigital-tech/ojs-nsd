import { afterEach, describe, expect, it, vi } from "vitest";

import { listAuthorSubmissions } from "@/application/submission/list-author-submissions";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";

vi.mock("@/application/identity/resolve-journal-roles", () => ({
  resolveJournalRoles: vi.fn(),
}));

vi.mock("@/infrastructure/submission/author-submission-repository", () => ({
  listAuthorSubmissionsFromDb: vi.fn(),
  getAuthorSubmissionDetailFromDb: vi.fn(),
  listJournalSectionsFromDb: vi.fn(),
}));

describe("listAuthorSubmissions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-authors", async () => {
    const { resolveJournalRoles } = await import(
      "@/application/identity/resolve-journal-roles"
    );
    vi.mocked(resolveJournalRoles).mockResolvedValue(["READER"]);

    await expect(
      listAuthorSubmissions({
        journalId: "journal_1",
        actorUserId: "user_1",
      }),
    ).rejects.toBeInstanceOf(SubmissionAuthorizationError);
  });

  it("returns author submissions for AUTHOR role", async () => {
    const { resolveJournalRoles } = await import(
      "@/application/identity/resolve-journal-roles"
    );
    const { listAuthorSubmissionsFromDb } = await import(
      "@/infrastructure/submission/author-submission-repository"
    );

    vi.mocked(resolveJournalRoles).mockResolvedValue(["AUTHOR"]);
    vi.mocked(listAuthorSubmissionsFromDb).mockResolvedValue([
      {
        id: "sub_1",
        status: "DRAFT",
        title: "Demo draft",
        updatedAt: new Date("2026-06-13"),
        hasManuscript: true,
      },
    ]);

    const result = await listAuthorSubmissions({
      journalId: "journal_1",
      actorUserId: "user_1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Demo draft");
  });
});
