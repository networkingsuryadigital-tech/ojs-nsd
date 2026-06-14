import { beforeEach, describe, expect, it, vi } from "vitest";

import { reconcileFailedNotifications } from "@/application/notification/reconcile-failed-notifications";
import { emitTransitionNotifications } from "@/application/notification/emit-transition-notifications";
import {
  listPendingFailedNotificationEvents,
  loadLatestEditorialDecision,
  markNotificationReconciled,
} from "@/infrastructure/notification/failed-notification-repository";

vi.mock("@/application/notification/emit-transition-notifications", () => ({
  emitTransitionNotifications: vi.fn(),
}));

vi.mock("@/infrastructure/notification/failed-notification-repository", () => ({
  listPendingFailedNotificationEvents: vi.fn(),
  loadLatestEditorialDecision: vi.fn(),
  markNotificationReconciled: vi.fn(),
}));

vi.mock("@/infrastructure/observability/report-side-effect-failure", () => ({
  reportSideEffectFailure: vi.fn(),
}));

describe("reconcileFailedNotifications", () => {
  beforeEach(() => {
    vi.mocked(listPendingFailedNotificationEvents).mockResolvedValue([]);
    vi.mocked(emitTransitionNotifications).mockResolvedValue({ dispatched: 1 });
    vi.mocked(markNotificationReconciled).mockResolvedValue(undefined);
  });

  it("retries failed transition notifications and marks them reconciled", async () => {
    vi.mocked(listPendingFailedNotificationEvents).mockResolvedValue([
      {
        id: "event-1",
        journalId: "journal-1",
        submissionId: "submission-1",
        effect: "emitTransitionNotifications:submit",
        createdAt: new Date(),
      },
    ]);

    const result = await reconcileFailedNotifications();

    expect(emitTransitionNotifications).toHaveBeenCalledWith({
      journalId: "journal-1",
      submissionId: "submission-1",
      transitionName: "submit",
      decision: undefined,
    });
    expect(markNotificationReconciled).toHaveBeenCalledWith({
      journalId: "journal-1",
      submissionId: "submission-1",
      sourceEventId: "event-1",
      effect: "emitTransitionNotifications:submit",
      dispatched: 1,
    });
    expect(result).toEqual({
      pendingFound: 1,
      retried: 1,
      dispatched: 1,
      skipped: 0,
    });
  });

  it("loads latest editorial decision for recordDecision retries", async () => {
    vi.mocked(listPendingFailedNotificationEvents).mockResolvedValue([
      {
        id: "event-2",
        journalId: "journal-1",
        submissionId: "submission-2",
        effect: "emitTransitionNotifications:recordDecision",
        createdAt: new Date(),
      },
    ]);
    vi.mocked(loadLatestEditorialDecision).mockResolvedValue({
      decision: "REJECT",
    });

    await reconcileFailedNotifications();

    expect(loadLatestEditorialDecision).toHaveBeenCalledWith("submission-2");
    expect(emitTransitionNotifications).toHaveBeenCalledWith({
      journalId: "journal-1",
      submissionId: "submission-2",
      transitionName: "recordDecision",
      decision: "REJECT",
    });
  });
});
