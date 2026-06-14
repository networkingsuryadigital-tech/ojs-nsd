/**
 * Observability stub — Sentry init will be wired per-app in a later sprint.
 */

export type Logger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export function createConsoleLogger(): Logger {
  return {
    info(message, meta) {
      console.info(message, meta ?? "");
    },
    warn(message, meta) {
      console.warn(message, meta ?? "");
    },
    error(message, meta) {
      console.error(message, meta ?? "");
    },
  };
}

export function initSentry(_dsn?: string): void {
  // Sentry wiring deferred — apps pass SENTRY_DSN when ready
}
