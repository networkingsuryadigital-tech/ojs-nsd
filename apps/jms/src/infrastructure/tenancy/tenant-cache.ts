import { Redis } from "@upstash/redis";

import type { ResolvedJournal } from "@/domain/tenancy/types";

const CACHE_PREFIX = "jms:tenant:host:";
const POSITIVE_TTL_SECONDS = 300;
const NEGATIVE_TTL_SECONDS = 60;
const NEGATIVE_SENTINEL = "__none__";

type TenantCacheConfig = {
  url?: string;
  token?: string;
};

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

function getRedis(config?: TenantCacheConfig): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = config?.url ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = config?.token ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!isConfiguredUpstash(url, token)) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url: url!, token: token! });
  return redisClient;
}

function cacheKey(host: string): string {
  return `${CACHE_PREFIX}${host.trim().toLowerCase()}`;
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

  const cached = await redis.get<string>(cacheKey(host));
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
  if (journal === null) {
    await redis.set(key, NEGATIVE_SENTINEL, { ex: NEGATIVE_TTL_SECONDS });
    return;
  }

  await redis.set(key, JSON.stringify(journal), { ex: POSITIVE_TTL_SECONDS });
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

  await redis.del(...hosts.map((host) => cacheKey(host)));
}

/** Test helper — reset singleton between tests. */
export function resetTenantCacheForTests(): void {
  redisClient = undefined;
}

export {
  CACHE_PREFIX,
  NEGATIVE_SENTINEL,
  NEGATIVE_TTL_SECONDS,
  POSITIVE_TTL_SECONDS,
};
