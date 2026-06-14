import "server-only";

import { withTenant } from "@/infrastructure/db/with-tenant";

export async function loadJournalRetentionDays(
  journalId: string,
): Promise<number | null> {
  const journal = await withTenant(journalId, (tx) =>
    tx.journal.findFirst({
      where: { id: journalId },
      select: { rejectedSubmissionRetentionDays: true },
    }),
  );
  return journal?.rejectedSubmissionRetentionDays ?? null;
}

export async function saveJournalRetentionDays(
  journalId: string,
  retentionDays: number | null,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.journal.update({
      where: { id: journalId },
      data: { rejectedSubmissionRetentionDays: retentionDays },
    }),
  );
}

export async function listExpiredRejectedSubmissions(
  journalId: string,
  retentionDays: number,
  now: Date,
): Promise<Array<{ id: string }>> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  return withTenant(journalId, (tx) =>
    tx.submission.findMany({
      where: {
        journalId,
        status: { in: ["DESK_REJECTED", "REJECTED"] },
        updatedAt: { lte: cutoff },
      },
      select: { id: true },
      take: 100,
    }),
  );
}

export async function deleteRejectedSubmission(
  journalId: string,
  submissionId: string,
): Promise<void> {
  await withTenant(journalId, (tx) =>
    tx.submission.delete({
      where: { id: submissionId, journalId },
    }),
  );
}
