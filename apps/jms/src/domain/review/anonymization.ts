/**
 * Produces a storage-safe generic filename for anonymized manuscripts.
 */
export function anonymizedManuscriptFilename(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "anonymized-manuscript.pdf";
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "anonymized-manuscript.docx";
  }
  if (mimeType === "application/msword") {
    return "anonymized-manuscript.doc";
  }
  return "anonymized-manuscript.bin";
}

export function buildAnonymizedStorageKey(input: {
  journalId: string;
  submissionId: string;
  fileId: string;
  mimeType: string;
  round?: number;
}): string {
  const round = input.round ?? 0;
  const filename = anonymizedManuscriptFilename(input.mimeType);
  return [
    "journals",
    input.journalId,
    "submissions",
    input.submissionId,
    `round-${round}`,
    "anonymized",
    `${input.fileId}-${filename}`,
  ].join("/");
}

/**
 * Strips common PDF document info entries that may contain author identity.
 * Best-effort — full redaction requires dedicated tooling in production.
 */
export function stripPdfMetadataMarkers(buffer: Buffer): Buffer {
  const text = buffer.toString("latin1");
  const sanitized = text
    .replace(/\/Author\s*\([^)]*\)/g, "/Author ()")
    .replace(/\/Creator\s*\([^)]*\)/g, "/Creator ()")
    .replace(/\/Producer\s*\([^)]*\)/g, "/Producer ()")
    .replace(/\/Title\s*\([^)]*\)/g, "/Title (Anonymized Manuscript)");
  return Buffer.from(sanitized, "latin1");
}
