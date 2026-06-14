import "server-only";

import { z } from "zod";

import { markNotificationRead as markRead } from "@/infrastructure/notification/notification-repository";

const markSchema = z.object({
  journalId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  notificationId: z.string().trim().min(1),
});

export async function markNotificationRead(
  input: z.infer<typeof markSchema>,
): Promise<{ updated: boolean }> {
  const parsed = markSchema.parse(input);
  const updated = await markRead(
    parsed.journalId,
    parsed.notificationId,
    parsed.userId,
  );
  return { updated };
}
