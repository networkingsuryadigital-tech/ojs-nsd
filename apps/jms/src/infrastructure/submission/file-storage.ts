import "server-only";

import { createSignedUrl, uploadFile } from "@nsd/storage";

import { getAdminSupabase } from "@/infrastructure/auth/supabase";

import { getSubmissionStorageBucket } from "./storage-config";

function buildSubmissionFileStorageKey(input: {
  journalId: string;
  submissionId: string;
  fileId: string;
  originalName: string;
  round: number;
  segment: "manuscript" | "revision" | "galley";
}): string {
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return [
    "journals",
    input.journalId,
    "submissions",
    input.submissionId,
    `round-${input.round}`,
    input.segment,
    `${input.fileId}-${safeName}`,
  ].join("/");
}

export function buildManuscriptStorageKey(input: {
  journalId: string;
  submissionId: string;
  fileId: string;
  originalName: string;
  round?: number;
}): string {
  return buildSubmissionFileStorageKey({
    ...input,
    round: input.round ?? 0,
    segment: "manuscript",
  });
}

export function buildRevisionStorageKey(input: {
  journalId: string;
  submissionId: string;
  fileId: string;
  originalName: string;
  round: number;
}): string {
  return buildSubmissionFileStorageKey({
    ...input,
    segment: "revision",
  });
}

export function buildGalleyStorageKey(input: {
  journalId: string;
  submissionId: string;
  fileId: string;
  originalName: string;
  label: string;
}): string {
  const safeLabel = input.label.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return [
    "journals",
    input.journalId,
    "submissions",
    input.submissionId,
    "galleys",
    safeLabel,
    `${input.fileId}-${safeName}`,
  ].join("/");
}

export async function uploadManuscriptToStorage(input: {
  storageKey: string;
  file: Buffer;
  mimeType: string;
}): Promise<void> {
  const supabase = getAdminSupabase();
  await uploadFile(supabase, {
    bucket: getSubmissionStorageBucket(),
    path: input.storageKey,
    file: input.file,
    contentType: input.mimeType,
    upsert: false,
  });
}

export async function createManuscriptSignedUrl(
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

export async function downloadManuscriptBytes(
  storageKey: string,
): Promise<Buffer> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.storage
    .from(getSubmissionStorageBucket())
    .download(storageKey);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download manuscript file.");
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
