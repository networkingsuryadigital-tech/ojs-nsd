/** Generic webhook idempotency — Prisma adapter lives in each app (ProcessedWebhook table). */

export interface WebhookIdempotencyStore {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, source: string): Promise<void>;
}

export async function processWebhookEvent(
  store: WebhookIdempotencyStore,
  eventId: string,
  source: string,
  handler: () => Promise<void>,
): Promise<{ processed: boolean }> {
  if (await store.isProcessed(eventId)) {
    return { processed: false };
  }

  await handler();
  await store.markProcessed(eventId, source);
  return { processed: true };
}
