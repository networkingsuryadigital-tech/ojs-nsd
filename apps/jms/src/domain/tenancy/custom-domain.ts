import { parseTenantHost } from "./host";

export type DomainDnsRecordType = "CNAME" | "TXT";

export type DomainDnsInstruction = {
  type: DomainDnsRecordType;
  name: string;
  value: string;
  purpose: "routing" | "ownership";
};

export type DomainDnsInstructions = {
  host: string;
  records: DomainDnsInstruction[];
};

export type DomainSslStatusValue = "PENDING" | "ACTIVE" | "FAILED";

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDnsValue(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function normalizeCustomDomainHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.includes(":") ? trimmed.split(":")[0]! : trimmed;
  return withoutPort.replace(/\.$/, "");
}

export function isValidCustomDomainHost(host: string): boolean {
  const normalized = normalizeCustomDomainHost(host);
  if (!normalized || normalized.includes("..")) {
    return false;
  }
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return false;
  }
  return HOSTNAME_PATTERN.test(normalized);
}

/**
 * Validates a custom domain host and rejects platform subdomains / bare labels.
 */
export function assertValidCustomDomain(
  host: string,
  platformHost: string,
): string {
  const normalized = normalizeCustomDomainHost(host);
  if (!isValidCustomDomainHost(normalized)) {
    throw new Error(`Invalid custom domain host: "${host}".`);
  }

  const lookup = parseTenantHost(normalized, platformHost);
  if (lookup.kind !== "custom_domain") {
    throw new Error(
      `Host "${normalized}" is reserved for the platform and cannot be used as a custom domain.`,
    );
  }

  return normalized;
}

export function txtVerificationHostname(host: string): string {
  const normalized = normalizeCustomDomainHost(host);
  return `_jms-verify.${normalized}`;
}

export function generateDomainVerifyToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildDomainDnsInstructions(
  host: string,
  verifyToken: string,
  cnameTarget: string,
): DomainDnsInstructions {
  const normalizedHost = normalizeCustomDomainHost(host);
  const normalizedTarget = normalizeDnsValue(cnameTarget);

  return {
    host: normalizedHost,
    records: [
      {
        type: "CNAME",
        name: normalizedHost,
        value: normalizedTarget,
        purpose: "routing",
      },
      {
        type: "TXT",
        name: txtVerificationHostname(normalizedHost),
        value: verifyToken,
        purpose: "ownership",
      },
    ],
  };
}

export function isCnamePointingToTarget(
  cnameValues: string[],
  target: string,
): boolean {
  const normalizedTarget = normalizeDnsValue(target);
  return cnameValues.some(
    (value) => normalizeDnsValue(value) === normalizedTarget,
  );
}

export function isTxtVerificationMatch(
  txtRecords: string[][],
  token: string,
): boolean {
  const normalizedToken = token.trim().toLowerCase();
  return txtRecords.some((record) =>
    record.some((value) => value.trim().toLowerCase() === normalizedToken),
  );
}

/** Domain may serve tenant traffic only after DNS verified and SSL active. */
export function isCustomDomainServingTraffic(
  verified: boolean,
  sslStatus: DomainSslStatusValue,
): boolean {
  return verified && sslStatus === "ACTIVE";
}

export function mapVercelToSslStatus(vercelVerified: boolean): DomainSslStatusValue {
  return vercelVerified ? "ACTIVE" : "PENDING";
}
