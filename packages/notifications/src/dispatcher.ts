import type {
  EmailSender,
  NotificationDispatcher,
  NotificationPersister,
  NotificationPayload,
  PersistNotificationInput,
} from "./types";

export function createNotificationDispatcher(deps: {
  store: NotificationPersister;
  sendEmail?: EmailSender;
}): NotificationDispatcher {
  return {
    async dispatch(payload: PersistNotificationInput) {
      const { email, ...notification } = payload;
      const record = await deps.store.persist(notification);

      if (!email || !deps.sendEmail) {
        return;
      }

      const result = await deps.sendEmail.send(email);
      if (result) {
        await deps.store.markEmailSent(record.id);
      }
    },
  };
}

export type { NotificationPayload, PersistNotificationInput };
