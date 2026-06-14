import "server-only";

import { completeSimilarityFromWebhook } from "@/application/similarity/process-similarity-check";
import { parseCopyleaksWebhookPayload } from "@/infrastructure/similarity/copyleaks-client";
import {
  hasProcessedCopyleaksWebhook,
  markCopyleaksWebhookProcessed,
} from "@/infrastructure/similarity/similarity-repository";

export type HandleCopyleaksWebhookResult =
  | { ok: true; outcome: "completed" | "processing" | "ignored" | "duplicate" }
  | { ok: false; error: string };

export async function handleCopyleaksWebhook(
  payload: unknown,
): Promise<HandleCopyleaksWebhookResult> {
  const parsed = parseCopyleaksWebhookPayload(payload);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  if (!parsed.completed) {
    return { ok: true, outcome: "processing" };
  }

  const record = payload as {
    scannedDocument?: { scanId?: string };
  };
  const scanId = record.scannedDocument?.scanId?.trim();
  if (!scanId) {
    return { ok: false, error: "Copyleaks webhook missing scanId." };
  }

  const eventId = `copyleaks:scan:${scanId}:completed`;
  if (await hasProcessedCopyleaksWebhook(eventId)) {
    return { ok: true, outcome: "duplicate" };
  }

  const result = await completeSimilarityFromWebhook({
    externalScanId: scanId,
    score: parsed.score,
  });
  if (result.outcome === "skipped") {
    return { ok: true, outcome: "ignored" };
  }

  await markCopyleaksWebhookProcessed(eventId);
  return { ok: true, outcome: "completed" };
}
