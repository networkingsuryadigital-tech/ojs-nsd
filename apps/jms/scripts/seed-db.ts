import { PrismaClient } from "@prisma/client";

const SEED_POOL_PARAMS = {
  connection_limit: "1",
  pool_timeout: "30",
} as const;

/**
 * Builds a conservative Prisma URL for Supabase free-tier seed runs.
 * Prefers the transaction pooler (6543) over direct 5432.
 */
export function buildSeedDatabaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  if (url.port === "5432") {
    url.port = "6543";
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
  }

  for (const [key, value] of Object.entries(SEED_POOL_PARAMS)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

let seedPrisma: PrismaClient | null = null;

export function getSeedPrismaClient(): PrismaClient {
  if (seedPrisma) {
    return seedPrisma;
  }

  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL is required. Copy apps/jms/.env.example → apps/jms/.env and configure Supabase Postgres.",
    );
  }

  seedPrisma = new PrismaClient({
    datasources: {
      db: { url: buildSeedDatabaseUrl(rawUrl) },
    },
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

  return seedPrisma;
}

export async function releaseSeedDbConnection(): Promise<void> {
  if (!seedPrisma) {
    return;
  }
  await seedPrisma.$disconnect();
  seedPrisma = null;
}

/** Clears the shared application Prisma client (avoids stale RLS session on pooler). */
export async function refreshApplicationPrisma(): Promise<void> {
  const globalState = globalThis as { prisma?: PrismaClient };
  if (!globalState.prisma) {
    return;
  }
  await globalState.prisma.$disconnect();
  globalState.prisma = undefined;
}

export async function disconnectSeedClients(): Promise<void> {
  const disconnects: Promise<void>[] = [];

  if (seedPrisma) {
    disconnects.push(seedPrisma.$disconnect());
    seedPrisma = null;
  }

  const globalState = globalThis as {
    prisma?: PrismaClient;
    adminDb?: PrismaClient;
  };

  if (globalState.prisma) {
    disconnects.push(globalState.prisma.$disconnect());
    globalState.prisma = undefined;
  }

  if (globalState.adminDb) {
    disconnects.push(globalState.adminDb.$disconnect());
    globalState.adminDb = undefined;
  }

  await Promise.all(disconnects);
}

export function isTransientSeedDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Timed out fetching a new connection") ||
    message.includes("connection pool") ||
    message.includes("ECONNRESET") ||
    message.includes("connection terminated") ||
    message.includes("Can't reach database server") ||
    message.includes("deadlock detected") ||
    message.includes("Submission not found") ||
    message.includes("Issue not found") ||
    message.includes("Unique constraint") ||
    message.includes("No record was found for an update") ||
    message.includes("required but not found")
  );
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retrySeedOperation<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientSeedDbError(error) || attempt === attempts) {
        throw error;
      }

      const delayMs = 1_000 * 2 ** (attempt - 1);
      console.warn(
        `[seed] ${label} gagal (percobaan ${attempt}/${attempts}), retry dalam ${delayMs}ms…`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}
