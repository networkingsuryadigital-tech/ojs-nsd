import { describe, expect, it, afterEach, vi } from "vitest";

describe("resolveRequestOrigin", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers non-localhost request host", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.doMock("next/headers", () => ({
      headers: async () =>
        new Headers({
          host: "ejournal.ptnsd.co.id",
          "x-forwarded-proto": "https",
        }),
    }));

    const { resolveRequestOrigin } = await import(
      "@/application/auth/request-origin"
    );
    await expect(resolveRequestOrigin()).resolves.toBe(
      "https://ejournal.ptnsd.co.id",
    );
  });

  it("avoids localhost fallback on Vercel when host is local", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ejournal.ptnsd.co.id");
    vi.stubEnv("VERCEL", "1");
    vi.doMock("next/headers", () => ({
      headers: async () =>
        new Headers({
          host: "localhost:3000",
        }),
    }));

    const { resolveRequestOrigin } = await import(
      "@/application/auth/request-origin"
    );
    await expect(resolveRequestOrigin()).resolves.toBe(
      "https://ejournal.ptnsd.co.id",
    );
  });

  it("uses VERCEL_URL when app url is still localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_URL", "ojs-nsd-jms.vercel.app");
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ host: "localhost:3000" }),
    }));

    const { resolveRequestOrigin } = await import(
      "@/application/auth/request-origin"
    );
    await expect(resolveRequestOrigin()).resolves.toBe(
      "https://ojs-nsd-jms.vercel.app",
    );
  });
});
