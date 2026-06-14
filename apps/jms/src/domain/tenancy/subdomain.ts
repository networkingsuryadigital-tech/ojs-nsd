const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "ftp",
  "static",
  "cdn",
]);

export function normalizeSubdomain(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSubdomain(subdomain: string): boolean {
  const normalized = normalizeSubdomain(subdomain);
  if (normalized.length < 2 || normalized.length > 63) {
    return false;
  }
  if (RESERVED_SUBDOMAINS.has(normalized)) {
    return false;
  }
  return SUBDOMAIN_PATTERN.test(normalized);
}

export function assertValidSubdomain(subdomain: string): string {
  const normalized = normalizeSubdomain(subdomain);
  if (!isValidSubdomain(normalized)) {
    throw new Error(
      "Subdomain must be 2–63 characters, lowercase alphanumeric with hyphens, and not reserved.",
    );
  }
  return normalized;
}
