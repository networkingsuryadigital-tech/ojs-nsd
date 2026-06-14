import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Privileged Prisma client for super-admin routes (`app/admin/*`).
 * Uses DIRECT_URL and bypasses tenant RLS — only for explicit cross-tenant use-cases.
 *
 * Sprint 2+: wire provisioningJournal and platform admin queries here.
 * Requires DATABASE_URL / DIRECT_URL with a role that has BYPASSRLS (Supabase postgres).
 */
const globalForAdminDb = globalThis as unknown as {
  adminDb: PrismaClient | undefined;
};

function createAdminClient(): PrismaClient {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for admin-db");
  }

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const adminDb = globalForAdminDb.adminDb ?? createAdminClient();

if (process.env.NODE_ENV !== "production") {
  globalForAdminDb.adminDb = adminDb;
}
