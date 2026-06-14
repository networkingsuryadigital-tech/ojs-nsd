import "server-only";

import { normalizeRepositoryHost } from "@/domain/oai/identifier";
import { env } from "@/lib/env";

export function resolveOaiSiteContext(input: {
  requestHost: string;
  requestProtocol: string;
}): { baseSiteUrl: string; repositoryHost: string } {
  const origin = `${input.requestProtocol}://${input.requestHost}`;
  const baseSiteUrl = (env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, "");
  const repositoryHost = normalizeRepositoryHost(
    new URL(baseSiteUrl).host || input.requestHost,
  );
  return { baseSiteUrl, repositoryHost };
}

export function resolveOaiSiteContextFromRequest(request: Request): {
  baseSiteUrl: string;
  repositoryHost: string;
} {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (url.protocol === "https:" ? "https" : "http");
  return resolveOaiSiteContext({ requestHost: host, requestProtocol: protocol });
}
