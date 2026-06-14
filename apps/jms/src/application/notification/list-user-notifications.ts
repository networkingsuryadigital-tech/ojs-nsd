import "server-only";

import { z } from "zod";

import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "@/infrastructure/notification/notification-repository";

const listSchema = z.object({
  journalId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  unreadOnly: z.boolean().optional(),
});

export async function listUserNotifications(input: z.infer<typeof listSchema>) {
  const parsed = listSchema.parse(input);
  const [items, unreadCount] = await Promise.all([
    listNotificationsForUser(parsed.journalId, parsed.userId, {
      limit: parsed.limit,
      unreadOnly: parsed.unreadOnly,
    }),
    countUnreadNotifications(parsed.journalId, parsed.userId),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    unreadCount,
  };
}
