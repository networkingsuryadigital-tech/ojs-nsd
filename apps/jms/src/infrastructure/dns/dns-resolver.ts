import "server-only";

import { promises as dns } from "node:dns";

export type DnsResolver = {
  resolveCname(host: string): Promise<string[] | null>;
  resolveTxt(host: string): Promise<string[][] | null>;
};

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOTFOUND"
  );
}

function isNoDataError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "ENODATA" ||
      (error as { code?: string }).code === "ENOTFOUND")
  );
}

export function createNodeDnsResolver(): DnsResolver {
  return {
    async resolveCname(host) {
      try {
        return await dns.resolveCname(host);
      } catch (error) {
        if (isNoDataError(error)) {
          return null;
        }
        throw error;
      }
    },
    async resolveTxt(host) {
      try {
        return await dns.resolveTxt(host);
      } catch (error) {
        if (isNoDataError(error) || isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
  };
}
