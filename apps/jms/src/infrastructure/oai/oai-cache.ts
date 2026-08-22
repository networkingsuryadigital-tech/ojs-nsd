import "server-only";

import Redis from "ioredis";

const CACHE_TTL_SECONDS = 300;
const VERSION_KEY_PREFIX = "oai:version:";
const RESPONSE_KEY_PREFIX = "oai:response:";

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

function getRedis(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }
  const url = process.env.REDIS_URL;
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

export async function getOaiCacheVersion(journalId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    return 0;
  }
  const value = await withRedis(redis, () =>
    redis.get(`${VERSION_KEY_PREFIX}${journalId}`),
  );
  if (value === undefined || value === null) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function bumpOaiCacheVersion(journalId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  await withRedis(redis, () => redis.incr(`${VERSION_KEY_PREFIX}${journalId}`));
}

export async function getCachedOaiResponse(
  cacheKey: string,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  const value = await withRedis(redis, () =>
    redis.get(`${RESPONSE_KEY_PREFIX}${cacheKey}`),
  );
  return typeof value === "string" ? value : null;
}

export async function setCachedOaiResponse(
  cacheKey: string,
  xml: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  await withRedis(redis, () =>
    redis.set(`${RESPONSE_KEY_PREFIX}${cacheKey}`, xml, "EX", CACHE_TTL_SECONDS),
  );
}

export function buildOaiResponseCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** Test helper — reset module-level Redis client between tests. */
export function resetOaiCacheClientForTests(): void {
  if (redisClient) {
    void redisClient.quit().catch(() => undefined);
  }
  redisClient = undefined;
}
