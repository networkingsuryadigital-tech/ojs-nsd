import { beforeEach, describe, expect, it, vi } from "vitest";

const listOverdueMock = vi.fn();
const markOverdueMock = vi.fn();
const hasRecentMock = vi.fn();
const listEditorsMock = vi.fn();
const findUserEmailMock = vi.fn();
const loadContextMock = vi.fn();
const dispatchMock = vi.fn();

vi.mock("@/infrastructure/notification/notification-repository", () => ({
  listOverdueReviewAssignments: (...args: unknown[]) => listOverdueMock(...args),
  markReviewAssignmentsOverdue: (...args: unknown[]) => markOverdueMock(...args),
  hasRecentNotification: (...args: unknown[]) => hasRecentMock(...args),
  listSubmissionParticipantUserIds: (...args: unknown[]) =>
    listEditorsMock(...args),
  findUserEmail: (...args: unknown[]) => findUserEmailMock(...args),
  loadNotificationContext: (...args: unknown[]) => loadContextMock(...args),
}));

vi.mock("@/infrastructure/notification/dispatcher", () => ({
  createJmsNotificationDispatcher: () => ({ dispatch: dispatchMock }),
  buildAbsoluteActionUrl: (path: string) => `https://app.test${path}`,
  resolveEmailFrom: () => "Jurnal <noreply@test.com>",
}));

describe("processOverdueReviewReminders", () => {
  beforeEach(() => {
    listOverdueMock.mockReset();
    markOverdueMock.mockReset();
    hasRecentMock.mockReset();
    listEditorsMock.mockReset();
    findUserEmailMock.mockReset();
    loadContextMock.mockReset();
    dispatchMock.mockReset();
  });

  it("sends reviewer and editor reminders for overdue assignments", async () => {
    listOverdueMock.mockResolvedValue([
      {
        id: "asg_1",
        dueAt: new Date("2026-06-01T00:00:00.000Z"),
        anonymousLabel: "Reviewer A",
        reviewerId: "rev_1",
        submissionId: "sub_1",
        journalId: "journal_1",
        submissionTitle: "Judul",
        journalName: "Jurnal Test",
      },
    ]);
    markOverdueMock.mockResolvedValue(1);
    hasRecentMock.mockResolvedValue(false);
    listEditorsMock.mockResolvedValue(["editor_1"]);
    findUserEmailMock.mockResolvedValue({ email: "user@test.com", name: "User" });
    loadContextMock.mockResolvedValue({
      journalName: "Jurnal Test",
      submissionTitle: "Judul",
      emailFromName: "Jurnal",
      emailFromAddress: "noreply@test.com",
    });
    dispatchMock.mockResolvedValue(undefined);

    const { processOverdueReviewReminders } = await import(
      "@/application/notification/process-overdue-review-reminders"
    );
    const result = await processOverdueReviewReminders(
      new Date("2026-06-09T00:00:00.000Z"),
    );

    expect(result.scanned).toBe(1);
    expect(result.markedOverdue).toBe(1);
    expect(result.remindersSent).toBe(1);
    expect(result.editorAlertsSent).toBe(1);
    expect(dispatchMock).toHaveBeenCalledTimes(2);
  });

  it("skips reminders sent within cooldown window", async () => {
    listOverdueMock.mockResolvedValue([
      {
        id: "asg_1",
        dueAt: new Date("2026-06-01T00:00:00.000Z"),
        anonymousLabel: null,
        reviewerId: "rev_1",
        submissionId: "sub_1",
        journalId: "journal_1",
        submissionTitle: "Judul",
        journalName: "Jurnal Test",
      },
    ]);
    markOverdueMock.mockResolvedValue(1);
    hasRecentMock.mockResolvedValue(true);
    listEditorsMock.mockResolvedValue([]);

    const { processOverdueReviewReminders } = await import(
      "@/application/notification/process-overdue-review-reminders"
    );
    const result = await processOverdueReviewReminders(
      new Date("2026-06-09T00:00:00.000Z"),
    );

    expect(result.remindersSent).toBe(0);
    expect(result.skippedRecent).toBeGreaterThan(0);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
