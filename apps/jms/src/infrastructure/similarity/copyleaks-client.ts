import "server-only";

import type { CopyleaksCredentials } from "@/infrastructure/similarity/credentials";
import {
  getCopyleaksApiBaseUrl,
  getCopyleaksLoginUrl,
} from "@/infrastructure/similarity/credentials";

type LoginResponse = {
  access_token?: string;
};

type CopyleaksCompletedPayload = {
  scannedDocument?: { scanId?: string };
  results?: {
    score?: { aggregatedScore?: number };
  };
  status?: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function parseAggregatedScore(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as CopyleaksCompletedPayload;
  const score = record.results?.score?.aggregatedScore;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

export async function loginCopyleaks(
  credentials: CopyleaksCredentials,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  let response: Response;
  try {
    response = await fetch(getCopyleaksLoginUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        key: credentials.apiKey,
      }),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Copyleaks login request failed.",
    );
  }

  if (!response.ok) {
    throw new Error(`Copyleaks login failed (${response.status}).`);
  }

  const payload = (await response.json()) as LoginResponse;
  const token = payload.access_token?.trim();
  if (!token) {
    throw new Error("Copyleaks login response missing access_token.");
  }

  cachedToken = {
    value: token,
    expiresAt: now + 47 * 60 * 60 * 1000,
  };
  return token;
}

export type CopyleaksSubmitResult =
  | { ok: true; scanId: string; completed: boolean; score: number | null }
  | { ok: false; error: string; retryable: boolean };

export async function submitCopyleaksFileScan(input: {
  credentials: CopyleaksCredentials;
  scanId: string;
  filename: string;
  content: Buffer;
  statusWebhookUrl: string | null;
}): Promise<CopyleaksSubmitResult> {
  const token = await loginCopyleaks(input.credentials);
  const baseUrl = getCopyleaksApiBaseUrl();

  const properties: Record<string, unknown> = {
    sandbox: input.credentials.isSandbox,
    pdf: { create: true },
  };
  if (input.statusWebhookUrl) {
    properties.webhooks = { status: input.statusWebhookUrl };
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/v3/scans/submit/file/${encodeURIComponent(input.scanId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: input.content.toString("base64"),
          filename: input.filename,
          properties,
        }),
      },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Copyleaks submit request failed.",
      retryable: true,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Copyleaks submit failed (${response.status}).`,
      retryable: response.status >= 500 || response.status === 429,
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const score = parseAggregatedScore(payload);
  if (score !== null) {
    return {
      ok: true,
      scanId: input.scanId,
      completed: true,
      score,
    };
  }

  return {
    ok: true,
    scanId: input.scanId,
    completed: false,
    score: null,
  };
}

export type CopyleaksPollResult =
  | { ok: true; completed: true; score: number }
  | { ok: true; completed: false }
  | { ok: false; error: string; retryable: boolean };

export function parseCopyleaksWebhookPayload(
  payload: unknown,
): CopyleaksPollResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid Copyleaks webhook payload.", retryable: false };
  }

  const record = payload as CopyleaksCompletedPayload;
  const status = record.status;
  if (status === 1) {
    return { ok: false, error: "Copyleaks scan failed.", retryable: true };
  }

  const score = parseAggregatedScore(payload);
  if (score !== null) {
    return { ok: true, completed: true, score };
  }

  return { ok: true, completed: false };
}

export function buildCopyleaksReportUrl(scanId: string): string {
  return `https://app.copyleaks.com/dashboard/v3/scan/${encodeURIComponent(scanId)}`;
}
