import "server-only";

import {
  createNotificationDispatcher,
  type EmailSender,
  type NotificationPersister,
} from "@nsd/notifications";
import { sendEmail } from "@nsd/email";

import { env } from "@/lib/env";
import {
  createNotification,
  markNotificationEmailSent,
} from "./notification-repository";

function buildFromAddress(
  journalFromName: string | null,
  journalFromAddress: string | null,
): string | undefined {
  if (journalFromAddress && journalFromName) {
    return `${journalFromName} <${journalFromAddress}>`;
  }
  if (journalFromAddress) return journalFromAddress;
  return undefined;
}

export function createJmsNotificationDispatcher(
  emailFrom?: string,
): ReturnType<typeof createNotificationDispatcher> {
  const resendConfig = {
    apiKey: env.RESEND_API_KEY,
    fromEmail: emailFrom ?? env.RESEND_FROM_EMAIL,
  };

  const persist: NotificationPersister = {
    async persist(input) {
      return createNotification(input.journalId, input);
    },
    async markEmailSent(id) {
      // journalId is required for tenant scope — carried on the notification row
      const { adminDb } = await import("@/infrastructure/db/admin-db");
      const row = await adminDb.notification.findUnique({
        where: { id },
        select: { journalId: true },
      });
      if (!row) return;
      await markNotificationEmailSent(row.journalId, id);
    },
  };

  const sendEmailAdapter: EmailSender = {
    async send(input) {
      return sendEmail(resendConfig, {
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    },
  };

  return createNotificationDispatcher({
    store: persist,
    sendEmail: env.RESEND_API_KEY ? sendEmailAdapter : undefined,
  });
}

export function buildAbsoluteActionUrl(path: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveEmailFrom(
  journalFromName: string | null,
  journalFromAddress: string | null,
): string | undefined {
  return buildFromAddress(journalFromName, journalFromAddress);
}
