import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedJournal } from "@/domain/tenancy/types";

const journal: ResolvedJournal = {
  id: "journal_test",
  subdomain: "demo",
  name: "Demo Journal",
};

const memoryStore = new Map<string, string>();

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    async get<T>(key: string): Promise<T | null> {
      return (memoryStore.get(key) as T | undefined) ?? null;
    }

    async set(key: string, value: string): Promise<"OK"> {
      memoryStore.set(key, value);
      return "OK";
    }

    async del(...keys: string[]): Promise<number> {
      let removed = 0;
      for (const key of keys) {
        if (memoryStore.delete(key)) {
          removed += 1;
        }
      }
      return removed;
    }
  },
}));

describe("tenant host cache", () => {
  beforeEach(() => {
    memoryStore.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://valid.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(async () => {
    const { resetTenantCacheForTests } = await import(
      "@/infrastructure/tenancy/tenant-cache"
    );
    resetTenantCacheForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("returns undefined when Upstash is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { resetTenantCacheForTests, getCachedJournalByHost } = await import(
      "@/infrastructure/tenancy/tenant-cache"
    );
    resetTenantCacheForTests();

    await expect(getCachedJournalByHost("demo.jms.nsd.id")).resolves.toBeUndefined();
  });

  it("reads and writes cached journals", async () => {
    const {
      CACHE_PREFIX,
      getCachedJournalByHost,
      resetTenantCacheForTests,
      setCachedJournalByHost,
    } = await import("@/infrastructure/tenancy/tenant-cache");
    resetTenantCacheForTests();

    const host = "demo.jms.nsd.id";
    await setCachedJournalByHost(host, journal);
    await expect(getCachedJournalByHost(host)).resolves.toEqual(journal);
    expect(memoryStore.has(`${CACHE_PREFIX}${host}`)).toBe(true);
  });

  it("caches negative lookups", async () => {
    const {
      CACHE_PREFIX,
      getCachedJournalByHost,
      NEGATIVE_SENTINEL,
      resetTenantCacheForTests,
      setCachedJournalByHost,
    } = await import("@/infrastructure/tenancy/tenant-cache");
    resetTenantCacheForTests();

    const host = "missing.jms.nsd.id";
    await setCachedJournalByHost(host, null);
    await expect(getCachedJournalByHost(host)).resolves.toBeNull();
    expect(memoryStore.get(`${CACHE_PREFIX}${host}`)).toBe(NEGATIVE_SENTINEL);
  });
});
