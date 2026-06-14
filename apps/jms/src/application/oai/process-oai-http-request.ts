import "server-only";

import { checkRateLimit } from "@nsd/observability/rate-limit";

import { handleOaiRequest } from "@/application/oai/handle-oai-request";
import { resolveOaiRateLimitPerMinute } from "@/application/operational/get-operational-health";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";
import { normalizeRepositoryHost } from "@/domain/oai/identifier";
import { env } from "@/lib/env";

export type ProcessOaiHttpRequestResult =
  | { kind: "xml"; xml: string; status: number }
  | {
      kind: "text";
      body: string;
      status: number;
      retryAfterSeconds?: number;
    };

function buildRequestUrls(request: Request): {
  baseUrl: string;
  baseSiteUrl: string;
  repositoryHost: string;
} {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const repositoryHost = normalizeRepositoryHost(host);
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (url.protocol === "https:" ? "https" : "http");
  const origin = `${protocol}://${host}`;
  return {
    baseUrl: `${origin}${url.pathname}`,
    baseSiteUrl: origin,
    repositoryHost,
  };
}

export async function processOaiHttpRequest(
  request: Request,
): Promise<ProcessOaiHttpRequestResult> {
  const { baseUrl, baseSiteUrl, repositoryHost } = buildRequestUrls(request);
  const url = new URL(request.url);

  let journalId: string;
  try {
    journalId = await resolveRequestJournalId();
  } catch {
    return {
      kind: "text",
      body: '<?xml version="1.0" encoding="UTF-8"?><error>Journal not found.</error>',
      status: 404,
    };
  }

  const rateLimit = await checkRateLimit(
    {
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    },
    `oai:${repositoryHost}`,
    { requestsPerMinute: resolveOaiRateLimitPerMinute() },
  );
  if (!rateLimit.success) {
    return {
      kind: "text",
      body: "Rate limit exceeded.",
      status: 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
    };
  }

  const result = await handleOaiRequest({
    journalId,
    baseUrl,
    baseSiteUrl,
    repositoryHost,
    searchParams: url.searchParams,
  });

  return { kind: "xml", xml: result.xml, status: result.status };
}
