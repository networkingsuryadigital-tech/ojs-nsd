import "server-only";

import {
  buildOverdueEditorAlertMessage,
  buildOverdueReviewNotificationMessage,
  buildNotificationEmailHtml,
} from "@/domain/notification/templates";
import { NOTIFICATION_TYPES } from "@/domain/notification/types";
import {
  buildAbsoluteActionUrl,
  createJmsNotificationDispatcher,
  resolveEmailFrom,
} from "@/infrastructure/notification/dispatcher";
import {
  findUserEmail,
  hasRecentNotification,
  listOverdueReviewAssignments,
  listSubmissionParticipantUserIds,
  markReviewAssignmentsOverdue,
} from "@/infrastructure/notification/notification-repository";

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ProcessOverdueReviewRemindersResult = {
  scanned: number;
  markedOverdue: number;
  remindersSent: number;
  editorAlertsSent: number;
  skippedRecent: number;
};

export async function processOverdueReviewReminders(
  now: Date = new Date(),
): Promise<ProcessOverdueReviewRemindersResult> {
  const overdue = await listOverdueReviewAssignments(now);
  const since = new Date(now.getTime() - REMINDER_COOLDOWN_MS);

  let remindersSent = 0;
  let editorAlertsSent = 0;
  let skippedRecent = 0;

  const markedOverdue = await markReviewAssignmentsOverdue(
    overdue.map((assignment) => assignment.id),
  );

  for (const assignment of overdue) {
    const reviewerMessage = buildOverdueReviewNotificationMessage({
      submissionId: assignment.submissionId,
      submissionTitle: assignment.submissionTitle,
      journalName: assignment.journalName,
      dueAt: assignment.dueAt,
      assignmentId: assignment.id,
    });

    const reviewerRecent = await hasRecentNotification(
      assignment.journalId,
      assignment.reviewerId,
      NOTIFICATION_TYPES.REVIEW_OVERDUE,
      reviewerMessage.link,
      since,
    );

    if (reviewerRecent) {
      skippedRecent += 1;
    } else {
      const sent = await sendOverdueNotification({
        journalId: assignment.journalId,
        submissionId: assignment.submissionId,
        userId: assignment.reviewerId,
        message: reviewerMessage,
        journalName: assignment.journalName,
      });
      if (sent) remindersSent += 1;
    }

    const editorIds = await listSubmissionParticipantUserIds(
      assignment.journalId,
      assignment.submissionId,
      ["HANDLING_EDITOR"],
    );

    const editorMessage = buildOverdueEditorAlertMessage({
      submissionId: assignment.submissionId,
      submissionTitle: assignment.submissionTitle,
      anonymousLabel: assignment.anonymousLabel,
    });

    for (const editorId of editorIds) {
      const editorRecent = await hasRecentNotification(
        assignment.journalId,
        editorId,
        NOTIFICATION_TYPES.REVIEW_OVERDUE,
        editorMessage.link,
        since,
      );
      if (editorRecent) {
        skippedRecent += 1;
        continue;
      }

      const sent = await sendOverdueNotification({
        journalId: assignment.journalId,
        submissionId: assignment.submissionId,
        userId: editorId,
        message: editorMessage,
        journalName: assignment.journalName,
      });
      if (sent) editorAlertsSent += 1;
    }
  }

  return {
    scanned: overdue.length,
    markedOverdue,
    remindersSent,
    editorAlertsSent,
    skippedRecent,
  };
}

async function sendOverdueNotification(input: {
  journalId: string;
  submissionId: string;
  userId: string;
  message: { type: string; title: string; body: string; link: string };
  journalName: string;
}): Promise<boolean> {
  const user = await findUserEmail(input.userId);
  if (!user) return false;

  const { loadNotificationContext } = await import(
    "@/infrastructure/notification/notification-repository"
  );
  const context = await loadNotificationContext(input.journalId, input.submissionId);
  const emailFrom = resolveEmailFrom(
    context?.emailFromName ?? null,
    context?.emailFromAddress ?? null,
  );
  const dispatcher = createJmsNotificationDispatcher(emailFrom);
  const actionUrl = buildAbsoluteActionUrl(input.message.link);

  try {
    await dispatcher.dispatch({
      journalId: input.journalId,
      userId: input.userId,
      type: input.message.type,
      title: input.message.title,
      body: input.message.body,
      link: input.message.link,
      email: {
        to: user.email,
        subject: `[${input.journalName}] ${input.message.title}`,
        html: buildNotificationEmailHtml({
          journalName: input.journalName,
          title: input.message.title,
          body: input.message.body,
          actionUrl,
        }),
        from: emailFrom,
      },
    });
    return true;
  } catch (error) {
    console.error(
      "processOverdueReviewReminders dispatch failed",
      input.userId,
      error,
    );
    return false;
  }
}
