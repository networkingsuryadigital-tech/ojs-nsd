import "server-only";

import { createConsoleLogger } from "@nsd/observability";

const logger = createConsoleLogger();

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function reportOperationalFailure(input: {
  scope: string;
  operation: string;
  journalId?: string;
  actorId?: string;
  error: unknown;
}): Promise<void> {
  logger.error("operational failure", {
    scope: input.scope,
    operation: input.operation,
    journalId: input.journalId,
    actorId: input.actorId,
    message: serializeError(input.error),
  });
}
