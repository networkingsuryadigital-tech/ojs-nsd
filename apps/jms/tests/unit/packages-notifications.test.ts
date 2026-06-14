import { describe, expect, it, vi } from "vitest";

import {
  createNotificationDispatcher,
  type NotificationPersister,
} from "@nsd/notifications";

describe("@nsd/notifications dispatcher", () => {
  it("persists notification and marks email sent when sender succeeds", async () => {
    const persist = vi.fn(async () => ({ id: "ntf_1" }));
    const markEmailSent = vi.fn(async () => undefined);
    const send = vi.fn(async () => ({ id: "email_1" }));

    const persister: NotificationPersister = {
      persist,
      markEmailSent,
    };

    const dispatcher = createNotificationDispatcher({
      store: persister,
      sendEmail: { send },
    });

    await dispatcher.dispatch({
      journalId: "journal_1",
      userId: "user_1",
      type: "TEST",
      title: "Hello",
      body: "World",
      email: {
        to: "user@test.com",
        subject: "Hello",
        html: "<p>World</p>",
      },
    });

    expect(persist).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
    expect(markEmailSent).toHaveBeenCalledWith("ntf_1");
  });

  it("persists in-app notification without email when sender missing", async () => {
    const persist = vi.fn(async () => ({ id: "ntf_2" }));
    const markEmailSent = vi.fn(async () => undefined);

    const dispatcher = createNotificationDispatcher({
      store: {
        persist,
        markEmailSent,
      },
    });

    await dispatcher.dispatch({
      journalId: "journal_1",
      userId: "user_1",
      type: "TEST",
      title: "In-app only",
    });

    expect(persist).toHaveBeenCalledOnce();
    expect(markEmailSent).not.toHaveBeenCalled();
  });
});
