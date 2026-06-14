import { describe, expect, it } from "vitest";

import {
  buildOverdueEditorAlertMessage,
  buildOverdueReviewNotificationMessage,
  buildTransitionNotificationMessage,
} from "@/domain/notification/templates";
import { NOTIFICATION_TYPES } from "@/domain/notification/types";

describe("notification templates", () => {
  it("builds submit notification for editors", () => {
    const message = buildTransitionNotificationMessage({
      transitionName: "submit",
      submissionId: "sub_1",
      submissionTitle: "Judul Naskah",
      journalName: "Jurnal Test",
    });
    expect(message?.type).toBe(NOTIFICATION_TYPES.SUBMISSION_RECEIVED);
    expect(message?.title).toContain("Naskah baru");
    expect(message?.link).toBe("/editorial/submissions/sub_1");
  });

  it("builds review invite with due date", () => {
    const dueAt = new Date("2026-07-01T00:00:00.000Z");
    const message = buildTransitionNotificationMessage({
      transitionName: "inviteReviewer",
      submissionId: "sub_1",
      submissionTitle: "Judul",
      journalName: "Jurnal Test",
      dueAt,
    });
    expect(message?.type).toBe(NOTIFICATION_TYPES.REVIEW_INVITED);
    expect(message?.body).toContain("Batas:");
  });

  it("builds editorial decision without leaking reviewer identity", () => {
    const message = buildTransitionNotificationMessage({
      transitionName: "recordDecision",
      submissionId: "sub_1",
      submissionTitle: "Judul",
      journalName: "Jurnal Test",
      decision: "MINOR_REVISION",
      note: "Perbaiki abstrak.",
    });
    expect(message?.type).toBe(NOTIFICATION_TYPES.EDITORIAL_DECISION);
    expect(message?.body).toContain("Revisi minor");
    expect(message?.body).not.toMatch(/reviewer/i);
  });

  it("builds overdue reviewer reminder", () => {
    const message = buildOverdueReviewNotificationMessage({
      submissionId: "sub_1",
      submissionTitle: "Judul",
      journalName: "Jurnal Test",
      dueAt: new Date("2026-06-01T00:00:00.000Z"),
      assignmentId: "asg_1",
    });
    expect(message.type).toBe(NOTIFICATION_TYPES.REVIEW_OVERDUE);
    expect(message.link).toContain("assignment=asg_1");
  });

  it("builds overdue editor alert with anonymous label", () => {
    const message = buildOverdueEditorAlertMessage({
      submissionId: "sub_1",
      submissionTitle: "Judul",
      anonymousLabel: "Reviewer A",
    });
    expect(message.body).toContain("Reviewer A");
    expect(message.body).not.toContain("@");
  });
});
