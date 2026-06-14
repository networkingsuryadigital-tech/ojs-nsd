import "server-only";

import { completeSimilarityFromWebhook } from "@/application/similarity/process-similarity-check";
import { parseIThenticateWebhookPayload } from "@/infrastructure/similarity/ithenticate-client";
import { buildSimilarityReportUrl } from "@/infrastructure/similarity/report-url";
import {
  findSimilarityJobByExternalScanId,
  hasProcessedSimilarityWebhook,
  markSimilarityWebhookProcessed,
} from "@/infrastructure/similarity/similarity-repository";

export type HandleTurnitinWebhookResult =
  | { ok: true; outcome: "completed" | "processing" | "ignored" | "duplicate" }
  | { ok: false; error: string };

export async function handleTurnitinWebhook(
  payload: unknown,
): Promise<HandleTurnitinWebhookResult> {
  const parsed = parseIThenticateWebhookPayload(payload);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  if (!parsed.completed) {
    return { ok: true, outcome: "processing" };
  }

  const record = payload as {
    submission_id?: string;
    similarity_report_id?: string;
    report_id?: string;
  };
  const submissionId = record.submission_id?.trim();
  const reportId = (record.similarity_report_id ?? record.report_id)?.trim();
  if (!submissionId || !reportId) {
    return { ok: false, error: "Turnitin webhook missing submission/report id." };
  }

  const externalScanId = `${submissionId}:${reportId}`;
  const eventId = `turnitin:report:${externalScanId}:completed`;
  if (await hasProcessedSimilarityWebhook(eventId)) {
    return { ok: true, outcome: "duplicate" };
  }

  const job = await findSimilarityJobByExternalScanId(externalScanId);
  if (!job) {
    const altJob = await findSimilarityJobByExternalScanId(submissionId);
    if (!altJob) {
      return { ok: true, outcome: "ignored" };
    }
  }

  const result = await completeSimilarityFromWebhook({
    externalScanId,
    score: parsed.score,
    provider: "ithenticate",
    reportUrl: buildSimilarityReportUrl("ithenticate", externalScanId),
  });
  if (result.outcome === "skipped") {
    return { ok: true, outcome: "ignored" };
  }

  await markSimilarityWebhookProcessed("turnitin", eventId);
  return { ok: true, outcome: "completed" };
}
