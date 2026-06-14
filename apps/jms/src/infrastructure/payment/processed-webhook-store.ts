import "server-only";

import type { WebhookIdempotencyStore } from "@nsd/payments";

export function createProcessedWebhookStore(): WebhookIdempotencyStore {
  return {
    async isProcessed(eventId: string) {
      const { adminDb } = await import("@/infrastructure/db/admin-db");
      const row = await adminDb.processedWebhook.findUnique({
        where: { eventId },
        select: { id: true },
      });
      return row !== null;
    },
    async markProcessed(eventId: string, source: string) {
      const { adminDb } = await import("@/infrastructure/db/admin-db");
      await adminDb.processedWebhook.upsert({
        where: { eventId },
        create: { eventId, source },
        update: {},
      });
    },
  };
}
