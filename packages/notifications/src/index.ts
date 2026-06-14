/**
 * Generic in-app + email notification dispatcher.
 * Editorial event→notification mapping lives in apps/jms.
 */

export type {
  EmailSender,
  NotificationDispatcher,
  NotificationEmail,
  NotificationPayload,
  NotificationPersister,
  PersistNotificationInput,
} from "./types";

export { createNotificationDispatcher } from "./dispatcher";

export function createNoOpDispatcher(): import("./types").NotificationDispatcher {
  return {
    async dispatch() {
      // no-op for tests or disabled environments
    },
  };
}
