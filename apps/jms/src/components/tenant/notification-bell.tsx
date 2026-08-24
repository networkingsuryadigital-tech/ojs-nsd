import Link from "next/link";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { listUserNotifications } from "@/application/notification/list-user-notifications";

type NotificationBellProps = {
  journalId: string;
  userId: string;
};

export async function NotificationBell({
  journalId,
  userId,
}: NotificationBellProps) {
  const t = await getTranslations("nav");
  let unreadCount = 0;
  try {
    const result = await listUserNotifications({
      journalId,
      userId,
      limit: 1,
    });
    unreadCount = result.unreadCount;
  } catch {
    unreadCount = 0;
  }

  return (
    <Link
      href="/notifications"
      aria-label={t("notifications")}
      title={t("notifications")}
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
      ) : null}
    </Link>
  );
}
