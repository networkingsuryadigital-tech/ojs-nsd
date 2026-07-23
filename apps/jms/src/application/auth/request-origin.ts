import "server-only";

import { headers } from "next/headers";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalHost(hostOrUrl: string): boolean {
  const value = hostOrUrl.trim().toLowerCase();
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.startsWith("http://0.0.0.0")
  );
}

function originFromAppUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl || isLocalHost(appUrl)) {
    return null;
  }
  try {
    return stripTrailingSlash(new URL(appUrl).origin);
  } catch {
    return null;
  }
}

function originFromVercel(): string | null {
  const vercelUrl = process.env.VERCEL_URL?.trim() || process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (!vercelUrl || isLocalHost(vercelUrl)) {
    return null;
  }
  const host = vercelUrl.replace(/^https?:\/\//, "");
  return `https://${host}`;
}

/**
 * Builds the public origin for the current request (tenant or platform host).
 * Prefers forwarded headers so reset emails stay on the same domain the user used.
 * Never falls back to localhost on Vercel/production (avoids broken reset emails).
 */
export async function resolveRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host")?.trim();

  if (host && !isLocalHost(host)) {
    const proto =
      headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }

  const configured = originFromAppUrl() ?? originFromVercel();
  if (configured) {
    return configured;
  }

  if (host) {
    const proto =
      headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (isLocalHost(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
