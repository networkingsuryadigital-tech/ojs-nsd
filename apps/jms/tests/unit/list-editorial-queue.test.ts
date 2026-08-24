import { afterEach, describe, expect, it, vi } from "vitest";

import { listEditorialQueue } from "@/application/editorial/list-editorial-queue";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";

vi.mock("@/application/identity/assert-journal-roles", () => ({
  assertJournalRoles: vi.fn(),
}));

vi.mock("@/infrastructure/editorial/editorial-queue-repository", () => ({
  listEditorialQueueFromDb: vi.fn(),
}));

describe("listEditorialQueue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects actors without editorial staff roles", async () => {
    const { assertJournalRoles } = await import(
      "@/application/identity/assert-journal-roles"
    );
    vi.mocked(assertJournalRoles).mockRejectedValue(
      new SubmissionAuthorizationError("forbidden"),
    );

    await expect(
      listEditorialQueue({
        journalId: "journal-1",
        actorId: "reviewer-1",
      }),
    ).rejects.toBeInstanceOf(SubmissionAuthorizationError);
  });

  it("passes journalId and resolved statuses to the tenant-scoped repository", async () => {
    const { assertJournalRoles } = await import(
      "@/application/identity/assert-journal-roles"
    );
    const { listEditorialQueueFromDb } = await import(
      "@/infrastructure/editorial/editorial-queue-repository"
    );

    vi.mocked(assertJournalRoles).mockResolvedValue(["SECTION_EDITOR"]);
    vi.mocked(listEditorialQueueFromDb).mockResolvedValue({
      items: [
        {
          id: "sub_1",
          title: "Naskah A",
          status: "UNDER_REVIEW",
          reviewRound: 1,
          updatedAt: new Date("2026-08-01"),
          submittedAt: new Date("2026-07-01"),
          sectionTitle: "Artikel",
          correspondingAuthorName: "Penulis Satu",
          overdueAssignmentCount: 0,
        },
      ],
      hasMore: false,
    });

    const result = await listEditorialQueue({
      journalId: "journal-1",
      actorId: "editor-1",
      status: "UNDER_REVIEW",
    });

    expect(assertJournalRoles).toHaveBeenCalledWith(
      "journal-1",
      "editor-1",
      ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"],
      expect.any(String),
    );
    expect(listEditorialQueueFromDb).toHaveBeenCalledWith({
      journalId: "journal-1",
      statuses: ["UNDER_REVIEW"],
      overdueOnly: false,
    });
    expect(result.items).toHaveLength(1);
    expect(result.status).toBe("UNDER_REVIEW");
    expect(result.pipeline).toBeUndefined();
  });

  it("maps pipeline filters and overdue attention without leaking reviewer identity", async () => {
    const { assertJournalRoles } = await import(
      "@/application/identity/assert-journal-roles"
    );
    const { listEditorialQueueFromDb } = await import(
      "@/infrastructure/editorial/editorial-queue-repository"
    );

    vi.mocked(assertJournalRoles).mockResolvedValue(["EDITOR_IN_CHIEF"]);
    vi.mocked(listEditorialQueueFromDb).mockResolvedValue({
      items: [],
      hasMore: false,
    });

    const result = await listEditorialQueue({
      journalId: "journal-1",
      actorId: "eic-1",
      pipeline: "peerReview",
      attention: "overdue",
    });

    expect(listEditorialQueueFromDb).toHaveBeenCalledWith({
      journalId: "journal-1",
      statuses: ["UNDER_REVIEW", "REVISIONS_REQUESTED", "RESUBMITTED"],
      overdueOnly: true,
    });
    expect(result.pipeline).toBe("peerReview");
    expect(result.overdueOnly).toBe(true);
    expect(result.items.some((item) => "reviewerName" in item)).toBe(false);
  });
});
