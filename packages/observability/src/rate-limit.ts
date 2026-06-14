import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitConfig = {
  url?: string;
  token?: string;
};

const ratelimitByWindow = new Map<string, Ratelimit>();

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

function getRatelimit(
  config: RateLimitConfig,
  requestsPerMinute = 30,
): Ratelimit | null {
  if (!isConfiguredUpstash(config.url, config.token)) {
    return null;
  }

  const windowKey = String(requestsPerMinute);
  const cached = ratelimitByWindow.get(windowKey);
  if (cached) {
    return cached;
  }

  const redis = new Redis({ url: config.url, token: config.token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requestsPerMinute, "1 m"),
    analytics: true,
  });
  ratelimitByWindow.set(windowKey, limiter);
  return limiter;
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
  const limiter = getRatelimit(config, requestsPerMinute);
  if (!limiter) return { success: true };
  const result = await limiter.limit(identifier);
  const retryAfterSeconds =
    result.success || !result.reset
      ? undefined
      : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return {
    success: result.success,
    remaining: result.remaining,
    retryAfterSeconds,
  };
}
