/** Publication integrity notices — pure validation (no I/O). */

export const PUBLICATION_NOTICE_TYPES = [
  "RETRACTION",
  "CORRECTION",
  "ERRATUM",
] as const;

export type PublicationNoticeType = (typeof PUBLICATION_NOTICE_TYPES)[number];

export class PublicationNoticeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationNoticeValidationError";
  }
}

export function parsePublicationNoticeType(
  raw: string | null | undefined,
): PublicationNoticeType {
  const value = String(raw ?? "").trim().toUpperCase();
  if ((PUBLICATION_NOTICE_TYPES as readonly string[]).includes(value)) {
    return value as PublicationNoticeType;
  }
  throw new PublicationNoticeValidationError(
    `Jenis pemberitahuan publikasi tidak valid: ${raw}`,
  );
}

export function parsePublicationNoticeReason(
  raw: string | null | undefined,
): string {
  const reason = String(raw ?? "").trim();
  if (reason.length < 10) {
    throw new PublicationNoticeValidationError(
      "Alasan pemberitahuan minimal 10 karakter.",
    );
  }
  if (reason.length > 5000) {
    throw new PublicationNoticeValidationError(
      "Alasan pemberitahuan maksimal 5000 karakter.",
    );
  }
  return reason;
}

export function formatPublicationNoticeDescription(
  noticeType: PublicationNoticeType,
  reason: string,
): string {
  const label =
    noticeType === "RETRACTION"
      ? "Retraction"
      : noticeType === "CORRECTION"
        ? "Correction"
        : "Erratum";
  return `${label}: ${reason}`;
}
