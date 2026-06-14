/** Pure predicates for post-transition side-effect reconciliation. */

import type { EditorialDecisionType, TransitionName } from "@/domain/submission/types";
import { TRANSITION_NAMES } from "@/domain/submission/types";

export const SIDE_EFFECT_FAILED_EVENT_TYPE = "SIDE_EFFECT_FAILED";
export const NOTIFICATION_RECONCILED_EVENT_TYPE = "NOTIFICATION_RECONCILED";
export const FAILED_NOTIFICATION_EFFECT_PREFIX = "emitTransitionNotifications:";

export function submissionNeedsApcInvoiceReconciliation(input: {
  status: string;
  hasInvoice: boolean;
}): boolean {
  return input.status === "ACCEPTED" && !input.hasInvoice;
}

export function submissionNeedsDoiDepositReconciliation(input: {
  status: string;
  doiPrefix: string | null | undefined;
  hasDoiDepositJob: boolean;
}): boolean {
  const prefix = input.doiPrefix?.trim() ?? "";
  return (
    input.status === "PUBLISHED" && prefix.length > 0 && !input.hasDoiDepositJob
  );
}

export function isFailedNotificationSideEffect(effect: unknown): effect is string {
  return (
    typeof effect === "string" &&
    effect.startsWith(FAILED_NOTIFICATION_EFFECT_PREFIX)
  );
}

export function parseFailedNotificationEffect(effect: string): {
  transitionName: TransitionName;
  decision?: EditorialDecisionType;
} | null {
  const suffix = effect.slice(FAILED_NOTIFICATION_EFFECT_PREFIX.length);
  if (suffix === "recordDecisionAccept") {
    return { transitionName: "recordDecision", decision: "ACCEPT" };
  }
  if (TRANSITION_NAMES.includes(suffix as TransitionName)) {
    return { transitionName: suffix as TransitionName };
  }
  return null;
}

export function notificationReconciliationNeedsDecision(
  transitionName: TransitionName,
): boolean {
  return transitionName === "recordDecision";
}
