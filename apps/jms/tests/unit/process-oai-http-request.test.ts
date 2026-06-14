import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkRateLimit, resolveRequestJournalId, handleOaiRequest } = vi.hoisted(
  () => ({
    checkRateLimit: vi.fn(),
    resolveRequestJournalId: vi.fn(),
    handleOaiRequest: vi.fn(),
  }),
);

vi.mock("@nsd/observability/rate-limit", () => ({
  checkRateLimit,
}));

vi.mock("@/application/tenancy/resolve-request-journal-id", () => ({
  resolveRequestJournalId,
}));

vi.mock("@/application/oai/handle-oai-request", () => ({
  handleOaiRequest,
}));

vi.mock("@/lib/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "token",
  },
}));

import { processOaiHttpRequest } from "@/application/oai/process-oai-http-request";

describe("processOaiHttpRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRequestJournalId.mockResolvedValue("journal-1");
    handleOaiRequest.mockResolvedValue({
      xml: '<?xml version="1.0"?><OAI-PMH/>',
      status: 200,
    });
  });

  it("returns 429 with retryAfterSeconds when rate limit exceeded", async () => {
    checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      retryAfterSeconds: 42,
    });

    const request = new Request(
      "http://demo.localhost:3000/api/oai?verb=ListRecords&metadataPrefix=oai_dc",
      { headers: { host: "demo.localhost:3000" } },
    );

    const result = await processOaiHttpRequest(request);

    expect(result).toEqual({
      kind: "text",
      body: "Rate limit exceeded.",
      status: 429,
      retryAfterSeconds: 42,
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.upstash.io",
        token: "token",
      }),
      "oai:demo.localhost",
      expect.objectContaining({ requestsPerMinute: expect.any(Number) }),
    );
    expect(handleOaiRequest).not.toHaveBeenCalled();
  });

  it("forwards OAI XML when rate limit allows", async () => {
    checkRateLimit.mockResolvedValue({ success: true, remaining: 29 });

    const request = new Request(
      "http://demo.localhost:3000/api/oai?verb=Identify",
      { headers: { host: "demo.localhost:3000" } },
    );

    const result = await processOaiHttpRequest(request);

    expect(result).toEqual({
      kind: "xml",
      xml: '<?xml version="1.0"?><OAI-PMH/>',
      status: 200,
    });
    expect(handleOaiRequest).toHaveBeenCalledOnce();
  });
});
