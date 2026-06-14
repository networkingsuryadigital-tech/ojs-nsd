import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

/** Session variable read by Postgres RLS policies (see prisma/rls-policies.sql). */
export const TENANT_SESSION_VAR = "app.current_journal_id";

type TenantTransactionClient = Prisma.TransactionClient;

/** Postgres role used inside withTenant — subject to RLS (no BYPASSRLS). */
export const TENANT_DB_ROLE = "jms_tenant";

function resolveTenantTransactionTimeoutMs(): number {
  const raw = process.env.PRISMA_TENANT_TX_TIMEOUT_MS;
  if (!raw?.trim()) {
    return 15_000;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return 15_000;
  }
  return parsed;
}

/**
 * Runs `fn` inside a transaction scoped to one journal tenant.
 * Assumes `jms_tenant` role (NOBYPASSRLS), sets `app.current_journal_id`,
 * and enables `row_security` so RLS policies apply.
 */
export async function withTenant<T>(
  journalId: string,
  fn: (tx: TenantTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${TENANT_DB_ROLE}`);
      await tx.$executeRaw`SELECT set_config(${TENANT_SESSION_VAR}, ${journalId}, true)`;
      await tx.$executeRaw`SET LOCAL row_security = on`;

      return fn(tx);
    },
    { maxWait: resolveTenantTransactionTimeoutMs(), timeout: resolveTenantTransactionTimeoutMs() },
  );
}

/** Reads the tenant journal id set for the current transaction (for tests/diagnostics). */
export async function getCurrentJournalId(
  tx: TenantTransactionClient,
): Promise<string | null> {
  const rows = await tx.$queryRaw<{ current_setting: string | null }[]>`
    SELECT current_setting(${TENANT_SESSION_VAR}, true) AS current_setting
  `;
  const value = rows[0]?.current_setting;
  if (!value || value === "") {
    return null;
  }
  return value;
}
