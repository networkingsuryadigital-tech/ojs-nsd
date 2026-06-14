import "server-only";

import type { PersistNotificationInput } from "@nsd/notifications";

import {
  buildNotificationEmailHtml,
  buildTransitionNotificationMessage,
} from "@/domain/notification/templates";
import type { EditorialDecisionType, TransitionName } from "@/domain/submission/types";
import {
  buildAbsoluteActionUrl,
  createJmsNotificationDispatcher,
  resolveEmailFrom,
} from "@/infrastructure/notification/dispatcher";
import {
  findUserEmail,
  listJournalEditorUserIds,
  listSubmissionParticipantUserIds,
  loadNotificationContext,
} from "@/infrastructure/notification/notification-repository";

export type EmitTransitionNotificationsInput = {
  journalId: string;
  submissionId: string;
  transitionName: TransitionName;
  payload?: Record<string, unknown>;
  decision?: EditorialDecisionType;
};

function parseDueAt(payload?: Record<string, unknown>): Date | undefined {
  const raw = payload?.dueAt;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseReviewerId(payload?: Record<string, unknown>): string | undefined {
  const raw = payload?.reviewerId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseNote(payload?: Record<string, unknown>): string | undefined {
  const raw = payload?.note;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parsePaymentUrl(payload?: Record<string, unknown>): string | undefined {
  const raw = payload?.paymentUrl;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

function parseDoi(payload?: Record<string, unknown>): string | undefined {
  const raw = payload?.doi;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

async function resolveRecipientUserIds(
  input: EmitTransitionNotificationsInput,
): Promise<string[]> {
  switch (input.transitionName) {
    case "submit":
      return listJournalEditorUserIds(input.journalId);
    case "inviteReviewer": {
      const reviewerId = parseReviewerId(input.payload);
      return reviewerId ? [reviewerId] : [];
    }
    case "submitReview":
    case "authorResubmit":
      return listSubmissionParticipantUserIds(input.journalId, input.submissionId, [
        "HANDLING_EDITOR",
      ]);
    case "recordDecision":
    case "createApcInvoice":
    case "waiveApc":
    case "publishToIssue":
      return listSubmissionParticipantUserIds(input.journalId, input.submissionId, [
        "AUTHOR",
        "CORRESPONDING_AUTHOR",
      ]);
    case "paymentSettled": {
      const [editors, authors] = await Promise.all([
        listJournalEditorUserIds(input.journalId),
        listSubmissionParticipantUserIds(input.journalId, input.submissionId, [
          "AUTHOR",
          "CORRESPONDING_AUTHOR",
          "HANDLING_EDITOR",
        ]),
      ]);
      return [...new Set([...editors, ...authors])];
    }
    default:
      return [];
  }
}

async function dispatchToUser(
  journalId: string,
  userId: string,
  message: { type: string; title: string; body: string; link: string },
  context: {
    journalName: string;
    emailFromName: string | null;
    emailFromAddress: string | null;
  },
): Promise<void> {
  const user = await findUserEmail(userId);
  if (!user) return;

  const emailFrom = resolveEmailFrom(
    context.emailFromName,
    context.emailFromAddress,
  );
  const dispatcher = createJmsNotificationDispatcher(emailFrom);
  const actionUrl = buildAbsoluteActionUrl(message.link);

  const emailHtml = buildNotificationEmailHtml({
    journalName: context.journalName,
    title: message.title,
    body: message.body,
    actionUrl,
  });

  const notification: PersistNotificationInput = {
    journalId,
    userId,
    type: message.type,
    title: message.title,
    body: message.body,
    link: message.link,
    email: {
      to: user.email,
      subject: `[${context.journalName}] ${message.title}`,
      html: emailHtml,
      from: emailFrom,
    },
  };

  await dispatcher.dispatch(notification);
}

/**
 * Maps editorial transitions to in-app + email notifications (03 §7).
 * Failures are logged but do not roll back the transition.
 */
export async function emitTransitionNotifications(
  input: EmitTransitionNotificationsInput,
): Promise<{ dispatched: number }> {
  const context = await loadNotificationContext(input.journalId, input.submissionId);
  if (!context) return { dispatched: 0 };

  const message = buildTransitionNotificationMessage({
    transitionName: input.transitionName,
    submissionId: input.submissionId,
    submissionTitle: context.submissionTitle,
    journalName: context.journalName,
    decision: input.decision,
    note: parseNote(input.payload),
    reviewerId: parseReviewerId(input.payload),
    dueAt: parseDueAt(input.payload),
    paymentUrl: parsePaymentUrl(input.payload),
    doi: parseDoi(input.payload),
  });
  if (!message) return { dispatched: 0 };

  const recipientIds = await resolveRecipientUserIds(input);
  let dispatched = 0;

  for (const userId of recipientIds) {
    try {
      await dispatchToUser(input.journalId, userId, message, context);
      dispatched += 1;
    } catch (error) {
      console.error("emitTransitionNotifications failed for user", userId, error);
    }
  }

  return { dispatched };
}
