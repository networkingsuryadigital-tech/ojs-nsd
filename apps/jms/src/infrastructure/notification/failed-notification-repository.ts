import "server-only";

import {
  NOTIFICATION_RECONCILED_EVENT_TYPE,
  SIDE_EFFECT_FAILED_EVENT_TYPE,
  isFailedNotificationSideEffect,
} from "@/domain/submission/side-effect-reconciliation";
import { appendEditorialEvent } from "@/infrastructure/submission/submission-repository";

export type FailedNotificationEvent = {
  id: string;
  journalId: string;
  submissionId: string;
  effect: string;
  createdAt: Date;
};

function readEffect(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const effect = (payload as { effect?: unknown }).effect;
  return typeof effect === "string" ? effect : null;
}

export async function listPendingFailedNotificationEvents(
  limit: number,
): Promise<FailedNotificationEvent[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const rows = await adminDb.editorialEvent.findMany({
    where: { type: SIDE_EFFECT_FAILED_EVENT_TYPE },
    orderBy: { createdAt: "asc" },
    take: limit * 3,
    select: {
      id: true,
      journalId: true,
      submissionId: true,
      payload: true,
      createdAt: true,
    },
  });

  const reconciledKeys = new Set<string>();
  const reconciledRows = await adminDb.editorialEvent.findMany({
    where: { type: NOTIFICATION_RECONCILED_EVENT_TYPE },
    select: { submissionId: true, payload: true },
  });

  for (const row of reconciledRows) {
    const sourceEventId = readReconciledSourceEventId(row.payload);
    const effect = readReconciledEffect(row.payload);
    if (sourceEventId && effect) {
      reconciledKeys.add(`${row.submissionId}:${sourceEventId}:${effect}`);
    }
  }

  const pending: FailedNotificationEvent[] = [];
  for (const row of rows) {
    const effect = readEffect(row.payload);
    if (!effect || !isFailedNotificationSideEffect(effect)) {
      continue;
    }
    const key = `${row.submissionId}:${row.id}:${effect}`;
    if (reconciledKeys.has(key)) {
      continue;
    }
    pending.push({
      id: row.id,
      journalId: row.journalId,
      submissionId: row.submissionId,
      effect,
      createdAt: row.createdAt,
    });
    if (pending.length >= limit) {
      break;
    }
  }

  return pending;
}

function readReconciledSourceEventId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const sourceEventId = (payload as { sourceEventId?: unknown }).sourceEventId;
  return typeof sourceEventId === "string" ? sourceEventId : null;
}

function readReconciledEffect(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const effect = (payload as { effect?: unknown }).effect;
  return typeof effect === "string" ? effect : null;
}

export async function loadLatestEditorialDecision(
  submissionId: string,
): Promise<{ decision: string } | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.editorialDecision.findFirst({
    where: { submissionId },
    orderBy: { createdAt: "desc" },
    select: { decision: true },
  });
}

export async function markNotificationReconciled(input: {
  journalId: string;
  submissionId: string;
  sourceEventId: string;
  effect: string;
  dispatched: number;
}): Promise<void> {
  await appendEditorialEvent(input.journalId, {
    submissionId: input.submissionId,
    actorId: null,
    type: NOTIFICATION_RECONCILED_EVENT_TYPE,
    payload: {
      sourceEventId: input.sourceEventId,
      effect: input.effect,
      dispatched: input.dispatched,
    },
  });
}
