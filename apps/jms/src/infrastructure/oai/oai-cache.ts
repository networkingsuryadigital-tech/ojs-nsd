import "server-only";

import { Redis } from "@upstash/redis";

const CACHE_TTL_SECONDS = 300;
const VERSION_KEY_PREFIX = "oai:version:";
const RESPONSE_KEY_PREFIX = "oai:response:";

let redisClient: Redis | null | undefined;

function isConfiguredUpstash(url?: string, token?: string): boolean {
  if (!url || !token) {
    return false;
  }
  if (url.includes("...") || url.includes("[") || token.includes("...")) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!isConfiguredUpstash(url, token)) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url: url!, token: token! });
  return redisClient;
}

export async function getOaiCacheVersion(journalId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    return 0;
  }
  const value = await redis.get<number>(`${VERSION_KEY_PREFIX}${journalId}`);
  return typeof value === "number" ? value : 0;
}

export async function bumpOaiCacheVersion(journalId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  await redis.incr(`${VERSION_KEY_PREFIX}${journalId}`);
}

export async function getCachedOaiResponse(
  cacheKey: string,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  const value = await redis.get<string>(`${RESPONSE_KEY_PREFIX}${cacheKey}`);
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
  await redis.set(`${RESPONSE_KEY_PREFIX}${cacheKey}`, xml, {
    ex: CACHE_TTL_SECONDS,
  });
}

export function buildOaiResponseCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** Test helper — reset module-level Redis client between tests. */
export function resetOaiCacheClientForTests(): void {
  redisClient = undefined;
}
