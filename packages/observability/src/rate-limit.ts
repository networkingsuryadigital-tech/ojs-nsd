import Redis from "ioredis";

export type RateLimitConfig = {
  /** Prefer REDIS_URL. Kept for backward-compatible callers. */
  redisUrl?: string;
  /** @deprecated Use redisUrl / REDIS_URL instead of Upstash REST. */
  url?: string;
  /** @deprecated Ignored — local Redis does not use a REST token. */
  token?: string;
};

type LimiterState = {
  redis: Redis;
  requestsPerMinute: number;
};

const limiterByWindow = new Map<string, LimiterState>();

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

function resolveRedisUrl(config: RateLimitConfig): string | undefined {
  return (
    config.redisUrl?.trim() ||
    process.env.REDIS_URL?.trim() ||
    // Legacy Upstash URL is not usable with ioredis — ignore.
    undefined
  );
}

function getLimiter(
  config: RateLimitConfig,
  requestsPerMinute = 30,
): LimiterState | null {
  const redisUrl = resolveRedisUrl(config);
  if (!isConfiguredRedisUrl(redisUrl)) {
    return null;
  }

  const windowKey = `${redisUrl}:${requestsPerMinute}`;
  const cached = limiterByWindow.get(windowKey);
  if (cached) {
    return cached;
  }

  const redis = new Redis(redisUrl!, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  const state = { redis, requestsPerMinute };
  limiterByWindow.set(windowKey, state);
  return state;
}

export type RateLimitResult = {
  success: boolean;
  remaining?: number;
  retryAfterSeconds?: number;
};

export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
  options?: { requestsPerMinute?: number },
): Promise<RateLimitResult> {
  const requestsPerMinute = options?.requestsPerMinute ?? 30;
  const limiter = getLimiter(config, requestsPerMinute);
  if (!limiter) return { success: true };

  try {
    if (limiter.redis.status !== "ready") {
      await limiter.redis.connect();
    }
    const key = `rl:${identifier}`;
    const count = await limiter.redis.incr(key);
    if (count === 1) {
      await limiter.redis.expire(key, 60);
    }
    const remaining = Math.max(0, requestsPerMinute - count);
    return {
      success: count <= requestsPerMinute,
      remaining,
      retryAfterSeconds: count <= requestsPerMinute ? undefined : 60,
    };
  } catch {
    return { success: true };
  }
}
