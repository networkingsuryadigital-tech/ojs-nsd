export type NotificationPayload = {
  journalId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
};

export type NotificationEmail = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export type PersistNotificationInput = NotificationPayload & {
  email?: NotificationEmail;
};

export type NotificationPersister = {
  persist(input: NotificationPayload): Promise<{ id: string }>;
  markEmailSent(id: string): Promise<void>;
};

export type EmailSender = {
  send(input: NotificationEmail): Promise<{ id: string } | null>;
};

export type NotificationDispatcher = {
  dispatch(payload: PersistNotificationInput): Promise<void>;
};
