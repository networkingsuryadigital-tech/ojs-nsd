import "server-only";

import { headers } from "next/headers";

/**
 * Builds the public origin for the current request (tenant or platform host).
 * Prefers forwarded headers so reset emails stay on the same domain the user used.
 */
export async function resolveRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host")?.trim();

  if (!host) {
    const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return fallback.replace(/\/$/, "");
  }

  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`;
}
