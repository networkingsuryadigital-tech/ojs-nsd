import "server-only";

import type { CrossRefCredentials } from "@/infrastructure/crossref/credentials";
import { getCrossRefApiBaseUrl } from "@/infrastructure/crossref/credentials";

export type CrossRefDepositResult =
  | { ok: true; batchId: string; raw: unknown }
  | { ok: false; error: string; retryable: boolean; raw?: unknown };

export type CrossRefDepositStatusResult =
  | { ok: true; status: "completed" | "failed" | "processing"; batchId: string; raw: unknown }
  | { ok: false; error: string; retryable: boolean; raw?: unknown };

function basicAuthHeader(credentials: CrossRefCredentials): string {
  const token = Buffer.from(
    `${credentials.depositorEmail}:${credentials.depositorPassword}`,
  ).toString("base64");
  return `Basic ${token}`;
}

function parseDepositBatchId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const message = record.message;
  if (message && typeof message === "object") {
    const messageRecord = message as Record<string, unknown>;
    const depositId = messageRecord["deposit-id"] ?? messageRecord.depositId;
    if (typeof depositId === "string" && depositId.trim()) {
      return depositId.trim();
    }
  }
  const topLevel =
    record["deposit-id"] ?? record.depositId ?? record["submission-id"];
  if (typeof topLevel === "string" && topLevel.trim()) {
    return topLevel.trim();
  }
  return null;
}

function parseDepositStatus(payload: unknown): "completed" | "failed" | "processing" | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const message = record.message;
  const statusSource =
    message && typeof message === "object" ?
      (message as Record<string, unknown>).status ?? record.status
    : record.status;
  if (typeof statusSource !== "string") {
    return null;
  }
  const normalized = statusSource.toLowerCase();
  if (normalized.includes("complete")) return "completed";
  if (normalized.includes("fail")) return "failed";
  return "processing";
}

export async function submitCrossRefDeposit(
  credentials: CrossRefCredentials,
  xml: string,
): Promise<CrossRefDepositResult> {
  const baseUrl = getCrossRefApiBaseUrl(credentials.isProduction);
  const form = new FormData();
  form.append("operation", "doMDUpload");
  form.append(
    "mdFile",
    new Blob([xml], { type: "application/xml" }),
    "doi.xml",
  );

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v2/deposits`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(credentials),
      },
      body: form,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "CrossRef deposit request failed.",
      retryable: true,
    };
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    payload = text ? { body: text } : null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `CrossRef deposit HTTP ${response.status}`,
      retryable: response.status >= 500 || response.status === 429,
      raw: payload,
    };
  }

  const batchId = parseDepositBatchId(payload);
  if (!batchId) {
    return {
      ok: false,
      error: "CrossRef deposit response missing batch id.",
      retryable: false,
      raw: payload,
    };
  }

  return { ok: true, batchId, raw: payload };
}

export async function fetchCrossRefDepositStatus(
  credentials: CrossRefCredentials,
  batchId: string,
): Promise<CrossRefDepositStatusResult> {
  const baseUrl = getCrossRefApiBaseUrl(credentials.isProduction);
  const url = new URL(`${baseUrl}/v2/deposits/${encodeURIComponent(batchId)}`);
  url.searchParams.set("usr", credentials.depositorEmail);
  url.searchParams.set("pwd", credentials.depositorPassword);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "CrossRef status request failed.",
      retryable: true,
    };
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      error: `CrossRef status HTTP ${response.status}`,
      retryable: response.status >= 500 || response.status === 429,
      raw: payload,
    };
  }

  const status = parseDepositStatus(payload) ?? "processing";
  return { ok: true, status, batchId, raw: payload };
}
