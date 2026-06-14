/** Data retention policies — pure validation (no I/O). */

export class RetentionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetentionValidationError";
  }
}

export function parseRejectedSubmissionRetentionDays(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const text = String(raw).trim();
  if (text === "") {
    return null;
  }
  const days = Number(text);
  if (!Number.isInteger(days) || days < 30 || days > 3650) {
    throw new RetentionValidationError(
      "Retensi naskah ditolak harus 30–3650 hari, atau kosong untuk tidak menghapus otomatis.",
    );
  }
  return days;
}

export function isRejectedSubmissionExpired(
  status: "DESK_REJECTED" | "REJECTED",
  updatedAt: Date,
  retentionDays: number,
  now: Date = new Date(),
): boolean {
  const ageMs = now.getTime() - updatedAt.getTime();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return ageMs >= retentionMs;
}
