import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { listUserNotifications } from "@/application/notification/list-user-notifications";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nsd/ui";

import { markReadFormAction } from "./actions";

export default async function NotificationsPage() {
  const actorId = await requireAuthenticatedUserId();
  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    notFound();
  }

  const { items, unreadCount } = await listUserNotifications({
    journalId,
    userId: actorId,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Notifikasi</CardTitle>
          <CardDescription>
            {unreadCount > 0
              ? `${unreadCount} belum dibaca`
              : "Semua notifikasi sudah dibaca"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className={`rounded-lg border p-4 ${item.isRead ? "opacity-80" : "border-primary/40 bg-primary/5"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    {item.body ? (
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {new Date(item.createdAt).toLocaleString("id-ID")}
                      {item.emailSent ? " · email terkirim" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {item.link ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={item.link}>Buka</Link>
                      </Button>
                    ) : null}
                    {!item.isRead ? (
                      <form action={markReadFormAction}>
                        <input
                          type="hidden"
                          name="notificationId"
                          value={item.id}
                        />
                        <Button size="sm" type="submit" variant="ghost">
                          Tandai dibaca
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
