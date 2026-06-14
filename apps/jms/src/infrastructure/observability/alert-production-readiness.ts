import "server-only";

import { createConsoleLogger } from "@nsd/observability";

const logger = createConsoleLogger();

let productionReadinessAlertSent = false;

export function alertProductionReadinessIfNeeded(input: {
  nodeEnv: string;
  productionReady: boolean;
  warnings: string[];
}): void {
  if (productionReadinessAlertSent) {
    return;
  }
  if (input.nodeEnv !== "production" || input.productionReady) {
    return;
  }

  productionReadinessAlertSent = true;
  logger.error("production readiness check failed", {
    warnings: input.warnings,
  });
}

/** Test-only reset for cold-start guard. */
export function resetProductionReadinessAlertForTests(): void {
  productionReadinessAlertSent = false;
}
