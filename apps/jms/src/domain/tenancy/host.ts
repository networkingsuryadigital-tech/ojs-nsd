export type TenantHostLookup =
  | { kind: "subdomain"; subdomain: string }
  | { kind: "custom_domain"; host: string }
  | { kind: "platform_admin" }
  | { kind: "unknown" };

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function stripPort(host: string): string {
  const bracketEnd = host.indexOf("]");
  if (host.startsWith("[") && bracketEnd !== -1) {
    return host.slice(0, bracketEnd + 1);
  }
  const colonIndex = host.lastIndexOf(":");
  if (colonIndex === -1) {
    return host;
  }
  const maybePort = host.slice(colonIndex + 1);
  if (/^\d+$/.test(maybePort)) {
    return host.slice(0, colonIndex);
  }
  return host;
}

/**
 * Maps an HTTP Host header to a tenant lookup strategy.
 * Platform subdomains: `{subdomain}.{platformHost}`.
 * Custom domains: full host (CNAME stub — verification in S4).
 */
export function parseTenantHost(
  host: string,
  platformHost: string,
): TenantHostLookup {
  const normalizedHost = normalizeHost(host);
  const normalizedPlatform = normalizeHost(platformHost);

  if (!normalizedHost) {
    return { kind: "unknown" };
  }

  const hostWithoutPort = stripPort(normalizedHost);
  const platformWithoutPort = stripPort(normalizedPlatform);

  if (
    hostWithoutPort === platformWithoutPort ||
    hostWithoutPort === `app.${platformWithoutPort}`
  ) {
    return { kind: "platform_admin" };
  }

  const subdomainSuffix = `.${platformWithoutPort}`;
  if (hostWithoutPort.endsWith(subdomainSuffix)) {
    const subdomain = hostWithoutPort.slice(0, -subdomainSuffix.length);
    if (subdomain && !subdomain.includes(".")) {
      return { kind: "subdomain", subdomain };
    }
  }

  return { kind: "custom_domain", host: hostWithoutPort };
}

/** Hostnames that should resolve to a provisioned journal. */
export function journalHostnames(
  subdomain: string,
  platformHost: string,
): string[] {
  const normalizedSubdomain = subdomain.trim().toLowerCase();
  const normalizedPlatform = normalizeHost(platformHost);
  const platformWithoutPort = stripPort(normalizedPlatform);
  const hosts = [`${normalizedSubdomain}.${platformWithoutPort}`];

  if (normalizedPlatform !== platformWithoutPort) {
    hosts.push(`${normalizedSubdomain}.${normalizedPlatform}`);
  }

  return hosts;
}
