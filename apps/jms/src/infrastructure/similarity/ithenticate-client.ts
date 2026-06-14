import "server-only";

import type { IThenticateCredentials } from "@/infrastructure/similarity/ithenticate-credentials";
import { getIThenticateApiBaseUrl } from "@/infrastructure/similarity/ithenticate-credentials";

type IThenticateRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryable: boolean; status?: number };

type SubmissionResponse = {
  id?: string;
  status?: string;
};

type SimilarityReportResponse = {
  id?: string;
  status?: string;
  overall_match_percentage?: number;
};

type ViewerUrlResponse = {
  viewer_url?: string;
};

function buildHeaders(credentials: IThenticateCredentials): HeadersInit {
  return {
    Authorization: `Bearer ${credentials.apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Turnitin-Integration-Name": credentials.integrationName,
    "X-Turnitin-Integration-Version": credentials.integrationVersion,
  };
}

function encodeFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/'/g, "%27");
}

async function parseJsonResponse<T>(response: Response): Promise<IThenticateRequestResult<T>> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `iThenticate request failed (${response.status}).`;

    return {
      ok: false,
      error: message,
      retryable: response.status >= 500 || response.status === 429,
      status: response.status,
    };
  }

  return { ok: true, data: payload as T };
}

export async function createIThenticateSubmission(input: {
  credentials: IThenticateCredentials;
  title: string;
  ownerId: string;
}): Promise<IThenticateRequestResult<{ submissionId: string }>> {
  const baseUrl = getIThenticateApiBaseUrl(input.credentials);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/submissions`, {
      method: "POST",
      headers: buildHeaders(input.credentials),
      body: JSON.stringify({
        owner: input.ownerId,
        title: input.title,
        submitter: input.ownerId,
        owner_default_permission_set: "LEARNER",
        eula: {
          accepted_timestamp: new Date().toISOString(),
          language: "en-US",
          version: "latest",
        },
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "iThenticate create submission failed.",
      retryable: true,
    };
  }

  const parsed = await parseJsonResponse<SubmissionResponse>(response);
  if (!parsed.ok) {
    return parsed;
  }

  const submissionId = parsed.data.id?.trim();
  if (!submissionId) {
    return {
      ok: false,
      error: "iThenticate create submission response missing id.",
      retryable: false,
    };
  }

  return { ok: true, data: { submissionId } };
}

export async function uploadIThenticateFile(input: {
  credentials: IThenticateCredentials;
  submissionId: string;
  filename: string;
  content: Buffer;
}): Promise<IThenticateRequestResult<{ uploaded: true }>> {
  const baseUrl = getIThenticateApiBaseUrl(input.credentials);
  const disposition = `inline; filename="${encodeFilename(input.filename)}"`;

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/submissions/${encodeURIComponent(input.submissionId)}/original`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${input.credentials.apiKey}`,
          "Content-Type": "binary/octet-stream",
          "Content-Disposition": disposition,
          "X-Turnitin-Integration-Name": input.credentials.integrationName,
          "X-Turnitin-Integration-Version": input.credentials.integrationVersion,
        },
        body: new Uint8Array(input.content),
      },
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "iThenticate upload failed.",
      retryable: true,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `iThenticate upload failed (${response.status}).`,
      retryable: response.status >= 500 || response.status === 429,
      status: response.status,
    };
  }

  return { ok: true, data: { uploaded: true } };
}

export async function generateIThenticateSimilarityReport(input: {
  credentials: IThenticateCredentials;
  submissionId: string;
}): Promise<IThenticateRequestResult<{ reportId: string }>> {
  const baseUrl = getIThenticateApiBaseUrl(input.credentials);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/submissions/${encodeURIComponent(input.submissionId)}/similarity_reports`,
      {
        method: "POST",
        headers: buildHeaders(input.credentials),
        body: JSON.stringify({
          indexing_settings: { add_to_index: false },
        }),
      },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "iThenticate similarity report request failed.",
      retryable: true,
    };
  }

  const parsed = await parseJsonResponse<SimilarityReportResponse>(response);
  if (!parsed.ok) {
    return parsed;
  }

  const reportId = parsed.data.id?.trim();
  if (!reportId) {
    return {
      ok: false,
      error: "iThenticate similarity report response missing id.",
      retryable: false,
    };
  }

  return { ok: true, data: { reportId } };
}

export async function getIThenticateSimilarityReport(input: {
  credentials: IThenticateCredentials;
  submissionId: string;
  reportId: string;
}): Promise<
  IThenticateRequestResult<{
    status: string;
    score: number | null;
    reportUrl: string | null;
  }>
> {
  const baseUrl = getIThenticateApiBaseUrl(input.credentials);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/submissions/${encodeURIComponent(input.submissionId)}/similarity_reports/${encodeURIComponent(input.reportId)}`,
      {
        method: "GET",
        headers: buildHeaders(input.credentials),
      },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "iThenticate report poll failed.",
      retryable: true,
    };
  }

  const parsed = await parseJsonResponse<SimilarityReportResponse>(response);
  if (!parsed.ok) {
    return parsed;
  }

  const status = parsed.data.status?.toUpperCase() ?? "PROCESSING";
  const score =
    typeof parsed.data.overall_match_percentage === "number" &&
    Number.isFinite(parsed.data.overall_match_percentage)
      ? parsed.data.overall_match_percentage
      : null;

  let reportUrl: string | null = null;
  if (status === "COMPLETE" || status === "COMPLETED") {
    reportUrl = await fetchIThenticateViewerUrl({
      credentials: input.credentials,
      submissionId: input.submissionId,
      reportId: input.reportId,
    });
  }

  return {
    ok: true,
    data: { status, score, reportUrl },
  };
}

async function fetchIThenticateViewerUrl(input: {
  credentials: IThenticateCredentials;
  submissionId: string;
  reportId: string;
}): Promise<string | null> {
  const baseUrl = getIThenticateApiBaseUrl(input.credentials);

  try {
    const response = await fetch(
      `${baseUrl}/submissions/${encodeURIComponent(input.submissionId)}/similarity_reports/${encodeURIComponent(input.reportId)}/viewer_url`,
      {
        method: "GET",
        headers: buildHeaders(input.credentials),
      },
    );
    if (!response.ok) {
      return buildIThenticateReportUrl(input.credentials, input.submissionId);
    }
    const payload = (await response.json()) as ViewerUrlResponse;
    return payload.viewer_url?.trim() ?? buildIThenticateReportUrl(input.credentials, input.submissionId);
  } catch {
    return buildIThenticateReportUrl(input.credentials, input.submissionId);
  }
}

export function buildIThenticateReportUrl(
  credentials: IThenticateCredentials,
  submissionId: string,
): string {
  const tenantBase = credentials.apiUrl.replace(/\/api\/v1$/, "");
  return `${tenantBase}/submissions/${encodeURIComponent(submissionId)}`;
}

export type IThenticatePollResult =
  | { ok: true; completed: true; score: number; reportUrl: string | null }
  | { ok: true; completed: false }
  | { ok: false; error: string; retryable: boolean };

export async function pollIThenticateScan(input: {
  credentials: IThenticateCredentials;
  externalScanId: string;
}): Promise<IThenticatePollResult> {
  const parts = input.externalScanId.split(":");
  if (parts.length !== 2) {
    return {
      ok: false,
      error: "Invalid iThenticate external scan id format.",
      retryable: false,
    };
  }

  const [submissionId, reportId] = parts;
  const result = await getIThenticateSimilarityReport({
    credentials: input.credentials,
    submissionId,
    reportId,
  });

  if (!result.ok) {
    return result;
  }

  const status = result.data.status;
  if (status === "FAILED" || status === "ERROR") {
    return {
      ok: false,
      error: "iThenticate similarity report failed.",
      retryable: true,
    };
  }

  if (
    (status === "COMPLETE" || status === "COMPLETED") &&
    result.data.score !== null
  ) {
    return {
      ok: true,
      completed: true,
      score: result.data.score,
      reportUrl: result.data.reportUrl,
    };
  }

  return { ok: true, completed: false };
}

export type IThenticateSubmitResult =
  | { ok: true; externalScanId: string; completed: boolean; score: number | null; reportUrl: string | null }
  | { ok: false; error: string; retryable: boolean };

export async function submitIThenticateFileScan(input: {
  credentials: IThenticateCredentials;
  scanId: string;
  filename: string;
  content: Buffer;
}): Promise<IThenticateSubmitResult> {
  const created = await createIThenticateSubmission({
    credentials: input.credentials,
    title: input.filename,
    ownerId: input.scanId,
  });
  if (!created.ok) {
    return created;
  }

  const uploaded = await uploadIThenticateFile({
    credentials: input.credentials,
    submissionId: created.data.submissionId,
    filename: input.filename,
    content: input.content,
  });
  if (!uploaded.ok) {
    return uploaded;
  }

  const report = await generateIThenticateSimilarityReport({
    credentials: input.credentials,
    submissionId: created.data.submissionId,
  });
  if (!report.ok) {
    return report;
  }

  const externalScanId = `${created.data.submissionId}:${report.data.reportId}`;
  const polled = await pollIThenticateScan({
    credentials: input.credentials,
    externalScanId,
  });

  if (polled.ok && polled.completed) {
    return {
      ok: true,
      externalScanId,
      completed: true,
      score: polled.score,
      reportUrl: polled.reportUrl,
    };
  }

  return {
    ok: true,
    externalScanId,
    completed: false,
    score: null,
    reportUrl: null,
  };
}

export function parseIThenticateWebhookPayload(
  payload: unknown,
): IThenticatePollResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: "Invalid iThenticate webhook payload.",
      retryable: false,
    };
  }

  const record = payload as {
    submission_id?: string;
    similarity_report_id?: string;
    report_id?: string;
    status?: string;
    overall_match_percentage?: number;
  };

  const submissionId = record.submission_id?.trim();
  const reportId = (record.similarity_report_id ?? record.report_id)?.trim();
  if (!submissionId || !reportId) {
    return { ok: true, completed: false };
  }

  const status = record.status?.toUpperCase() ?? "";
  if (status === "FAILED" || status === "ERROR") {
    return {
      ok: false,
      error: "iThenticate similarity report failed.",
      retryable: true,
    };
  }

  const score =
    typeof record.overall_match_percentage === "number" &&
    Number.isFinite(record.overall_match_percentage)
      ? record.overall_match_percentage
      : null;

  if (
    (status === "COMPLETE" || status === "COMPLETED" || status === "") &&
    score !== null
  ) {
    return {
      ok: true,
      completed: true,
      score,
      reportUrl: null,
    };
  }

  return { ok: true, completed: false };
}
