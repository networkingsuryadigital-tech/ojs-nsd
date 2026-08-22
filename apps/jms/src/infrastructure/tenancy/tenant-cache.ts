import Redis from "ioredis";

import type { ResolvedJournal } from "@/domain/tenancy/types";

const CACHE_PREFIX = "jms:tenant:host:";
const POSITIVE_TTL_SECONDS = 300;
const NEGATIVE_TTL_SECONDS = 60;
const NEGATIVE_SENTINEL = "__none__";

type TenantCacheConfig = {
  redisUrl?: string;
};

let redisClient: Redis | null | undefined;

function isConfiguredRedisUrl(url?: string): boolean {
  if (!url?.trim()) {
    return false;
  }
  if (url.includes("...") || url.includes("[")) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
  } catch {
    return false;
  }
}

function getRedis(config?: TenantCacheConfig): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = config?.redisUrl ?? process.env.REDIS_URL;
  if (!isConfiguredRedisUrl(url)) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis(url!, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  return redisClient;
}

function cacheKey(host: string): string {
  return `${CACHE_PREFIX}${host.trim().toLowerCase()}`;
}

async function withRedis<T>(
  redis: Redis,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    return await operation();
  } catch {
    return undefined;
  }
}

/** Returns undefined on cache miss. */
export async function getCachedJournalByHost(
  host: string,
  config?: TenantCacheConfig,
): Promise<ResolvedJournal | null | undefined> {
  const redis = getRedis(config);
  if (!redis) {
    return undefined;
  }

  const cached = await withRedis(redis, () => redis.get(cacheKey(host)));
  if (cached === null || cached === undefined) {
    return undefined;
  }
  if (cached === NEGATIVE_SENTINEL) {
    return null;
  }

  return JSON.parse(cached) as ResolvedJournal;
}

export async function setCachedJournalByHost(
  host: string,
  journal: ResolvedJournal | null,
  config?: TenantCacheConfig,
): Promise<void> {
  const redis = getRedis(config);
  if (!redis) {
    return;
  }

  const key = cacheKey(host);
  await withRedis(redis, async () => {
    if (journal === null) {
      await redis.set(key, NEGATIVE_SENTINEL, "EX", NEGATIVE_TTL_SECONDS);
      return;
    }
    await redis.set(key, JSON.stringify(journal), "EX", POSITIVE_TTL_SECONDS);
  });
}

export async function warmTenantHostCache(
  hosts: string[],
  journal: ResolvedJournal,
  config?: TenantCacheConfig,
): Promise<void> {
  await Promise.all(
    hosts.map((host) => setCachedJournalByHost(host, journal, config)),
  );
}

export async function invalidateTenantHostCache(
  hosts: string[],
  config?: TenantCacheConfig,
): Promise<void> {
  const redis = getRedis(config);
  if (!redis || hosts.length === 0) {
    return;
  }

  await withRedis(redis, () =>
    redis.del(...hosts.map((host) => cacheKey(host))),
  );
}

/** Test helper — reset singleton between tests. */
export function resetTenantCacheForTests(): void {
  if (redisClient) {
    void redisClient.quit().catch(() => undefined);
  }
  redisClient = undefined;
}

export {
  CACHE_PREFIX,
  NEGATIVE_SENTINEL,
  NEGATIVE_TTL_SECONDS,
  POSITIVE_TTL_SECONDS,
};
