"use server";

import { markNotificationRead } from "@/application/notification/mark-notification-read";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function markReadFormAction(formData: FormData) {
  const journalId = await resolveRequestJournalId();
  const userId = await requireAuthenticatedUserId();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!userId || !notificationId) return;

  await markNotificationRead({ journalId, userId, notificationId });
}
