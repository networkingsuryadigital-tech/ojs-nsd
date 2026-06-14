import { afterEach, describe, expect, it, vi } from "vitest";

import { createVercelDomainsClient } from "@/infrastructure/vercel/vercel-domains-client";

describe("createVercelDomainsClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports not configured without credentials", () => {
    const client = createVercelDomainsClient({
      apiToken: undefined,
      projectId: undefined,
    });
    expect(client.isConfigured()).toBe(false);
  });

  it("adds project domain via Vercel API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: "jurnal.example.ac.id" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createVercelDomainsClient({
      apiToken: "test-token",
      projectId: "prj_test",
    });

    await client.addProjectDomain("jurnal.example.ac.id");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vercel.com/v10/projects/prj_test/domains",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("maps Vercel verified flag to SSL status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "jurnal.example.ac.id",
            verified: true,
            misconfigured: false,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = createVercelDomainsClient({
      apiToken: "test-token",
      projectId: "prj_test",
    });

    await expect(client.getSslStatus("jurnal.example.ac.id")).resolves.toBe(
      "ACTIVE",
    );
  });

  it("returns FAILED when domain is misconfigured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "jurnal.example.ac.id",
          verified: false,
          misconfigured: true,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createVercelDomainsClient({
      apiToken: "test-token",
      projectId: "prj_test",
    });

    await expect(client.getSslStatus("jurnal.example.ac.id")).resolves.toBe(
      "FAILED",
    );
  });
});
