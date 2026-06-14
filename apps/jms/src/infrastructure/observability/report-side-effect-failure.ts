import "server-only";

import { createConsoleLogger } from "@nsd/observability";

import { SIDE_EFFECT_FAILED_EVENT_TYPE } from "@/domain/submission/side-effect-reconciliation";
import { appendEditorialEvent } from "@/infrastructure/submission/submission-repository";

const logger = createConsoleLogger();

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function reportSideEffectFailure(input: {
  journalId: string;
  submissionId: string;
  effect: string;
  error: unknown;
  actorId?: string;
}): Promise<void> {
  logger.error("transition side-effect failed", {
    journalId: input.journalId,
    submissionId: input.submissionId,
    effect: input.effect,
    message: serializeError(input.error),
  });

  try {
    await appendEditorialEvent(input.journalId, {
      submissionId: input.submissionId,
      actorId: input.actorId ?? null,
      type: SIDE_EFFECT_FAILED_EVENT_TYPE,
      payload: {
        effect: input.effect,
        message: serializeError(input.error),
      },
    });
  } catch (recordError) {
    logger.error("failed to record SIDE_EFFECT_FAILED editorial event", {
      journalId: input.journalId,
      submissionId: input.submissionId,
      effect: input.effect,
      message: serializeError(recordError),
    });
  }
}
