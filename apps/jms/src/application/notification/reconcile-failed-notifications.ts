import "server-only";

import {
  EDITORIAL_DECISION_TYPES,
  type EditorialDecisionType,
} from "@/domain/submission/types";
import {
  notificationReconciliationNeedsDecision,
  parseFailedNotificationEffect,
} from "@/domain/submission/side-effect-reconciliation";
import { emitTransitionNotifications } from "@/application/notification/emit-transition-notifications";
import { reportSideEffectFailure } from "@/infrastructure/observability/report-side-effect-failure";
import {
  listPendingFailedNotificationEvents,
  loadLatestEditorialDecision,
  markNotificationReconciled,
} from "@/infrastructure/notification/failed-notification-repository";

const RECONCILIATION_BATCH_LIMIT = 25;

export type ReconcileFailedNotificationsResult = {
  pendingFound: number;
  retried: number;
  dispatched: number;
  skipped: number;
};

function parseEditorialDecision(
  value: string,
): EditorialDecisionType | undefined {
  return EDITORIAL_DECISION_TYPES.includes(value as EditorialDecisionType)
    ? (value as EditorialDecisionType)
    : undefined;
}

export async function reconcileFailedNotifications(): Promise<ReconcileFailedNotificationsResult> {
  const pending = await listPendingFailedNotificationEvents(
    RECONCILIATION_BATCH_LIMIT,
  );

  let retried = 0;
  let dispatched = 0;
  let skipped = 0;

  for (const event of pending) {
    const retryInput = parseFailedNotificationEffect(event.effect);
    if (!retryInput) {
      skipped += 1;
      continue;
    }

    let decision = retryInput.decision;
    if (notificationReconciliationNeedsDecision(retryInput.transitionName)) {
      if (!decision) {
        const latest = await loadLatestEditorialDecision(event.submissionId);
        decision = latest ? parseEditorialDecision(latest.decision) : undefined;
      }
      if (!decision) {
        skipped += 1;
        continue;
      }
    }

    try {
      const result = await emitTransitionNotifications({
        journalId: event.journalId,
        submissionId: event.submissionId,
        transitionName: retryInput.transitionName,
        decision,
      });
      retried += 1;
      dispatched += result.dispatched;
      await markNotificationReconciled({
        journalId: event.journalId,
        submissionId: event.submissionId,
        sourceEventId: event.id,
        effect: event.effect,
        dispatched: result.dispatched,
      });
    } catch (error) {
      await reportSideEffectFailure({
        journalId: event.journalId,
        submissionId: event.submissionId,
        effect: `reconcileFailedNotifications:${event.effect}`,
        error,
      });
    }
  }

  return {
    pendingFound: pending.length,
    retried,
    dispatched,
    skipped,
  };
}
