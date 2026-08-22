import "server-only";

import {
  buildAnonymizedStorageKey,
  stripDocxAppPropertiesXml,
  stripDocxCorePropertiesXml,
  stripPdfMetadataMarkers,
} from "@/domain/review/anonymization";
import { withTenant } from "@/infrastructure/db/with-tenant";
import { downloadFile, uploadFile } from "@nsd/storage";

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

  const bucket = getSubmissionStorageBucket();
  const sourceBuffer = await downloadFile({
    bucket,
    path: manuscript.storageKey,
  });

  const anonymizedBuffer = await anonymizeManuscriptBuffer(
    sourceBuffer,
    manuscript.mimeType,
  );

  const fileId = crypto.randomUUID();
  const storageKey = buildAnonymizedStorageKey({
    journalId,
    submissionId,
    fileId,
    mimeType: manuscript.mimeType,
    round,
  });

  await uploadFile({
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

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function anonymizeManuscriptBuffer(
  sourceBuffer: Buffer,
  mimeType: string,
): Promise<Buffer> {
  if (mimeType === "application/pdf") {
    return stripPdfMetadataMarkers(sourceBuffer);
  }

  if (mimeType === DOCX_MIME) {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(sourceBuffer);
      const coreFile = zip.file("docProps/core.xml");
      if (coreFile) {
        const xml = await coreFile.async("string");
        zip.file("docProps/core.xml", stripDocxCorePropertiesXml(xml));
      }
      const appFile = zip.file("docProps/app.xml");
      if (appFile) {
        const xml = await appFile.async("string");
        zip.file("docProps/app.xml", stripDocxAppPropertiesXml(xml));
      }
      const output = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
      return Buffer.from(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `DOCX anonymization failed; original file will not be sent to reviewers. ${message}`,
      );
    }
  }

  return sourceBuffer;
}
