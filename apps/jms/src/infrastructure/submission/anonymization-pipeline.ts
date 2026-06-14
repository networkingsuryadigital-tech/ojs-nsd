import "server-only";

import {
  buildAnonymizedStorageKey,
  stripPdfMetadataMarkers,
} from "@/domain/review/anonymization";
import { getAdminSupabase } from "@/infrastructure/auth/supabase";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { createSignedUrl, uploadFile } from "@nsd/storage";

import { getSubmissionStorageBucket } from "./storage-config";

export async function ensureAnonymizedManuscript(
  journalId: string,
  submissionId: string,
  round = 0,
): Promise<{ fileId: string; storageKey: string; created: boolean }> {
  const existing = await withTenant(journalId, (tx) =>
    tx.submissionFile.findFirst({
      where: {
        submissionId,
        type: "ANONYMIZED_MANUSCRIPT",
        round,
      },
      select: { id: true, storageKey: true },
    }),
  );

  if (existing) {
    return { fileId: existing.id, storageKey: existing.storageKey, created: false };
  }

  const manuscript = await withTenant(journalId, (tx) =>
    tx.submissionFile.findFirst({
      where: {
        submissionId,
        type: "MANUSCRIPT",
        round,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        originalName: true,
        sizeBytes: true,
        uploadedById: true,
      },
    }),
  );

  if (!manuscript) {
    throw new Error("Manuscript file is required before anonymization.");
  }

  const supabase = getAdminSupabase();
  const bucket = getSubmissionStorageBucket();
  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(manuscript.storageKey);
  if (downloadError) {
    throw new Error(downloadError.message);
  }
  const sourceBuffer = Buffer.from(await downloaded.arrayBuffer());

  const anonymizedBuffer =
    manuscript.mimeType === "application/pdf"
      ? stripPdfMetadataMarkers(sourceBuffer)
      : sourceBuffer;

  const fileId = crypto.randomUUID();
  const storageKey = buildAnonymizedStorageKey({
    journalId,
    submissionId,
    fileId,
    mimeType: manuscript.mimeType,
    round,
  });

  await uploadFile(supabase, {
    bucket,
    path: storageKey,
    file: anonymizedBuffer,
    contentType: manuscript.mimeType,
    upsert: false,
  });

  const record = await withTenant(journalId, (tx) =>
    tx.submissionFile.create({
      data: {
        submissionId,
        type: "ANONYMIZED_MANUSCRIPT",
        round,
        storageKey,
        originalName: "anonymized-manuscript",
        mimeType: manuscript.mimeType,
        sizeBytes: anonymizedBuffer.length,
        isAnonymized: true,
        uploadedById: manuscript.uploadedById,
      },
      select: { id: true, storageKey: true },
    }),
  );

  return {
    fileId: record.id,
    storageKey: record.storageKey,
    created: true,
  };
}

export async function createAnonymizedManuscriptSignedUrl(
  storageKey: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getAdminSupabase();
  return createSignedUrl(supabase, {
    bucket: getSubmissionStorageBucket(),
    path: storageKey,
    expiresInSeconds,
  });
}
