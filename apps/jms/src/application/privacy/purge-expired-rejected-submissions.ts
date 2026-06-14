import "server-only";

import {
  deleteRejectedSubmission,
  listExpiredRejectedSubmissions,
} from "@/infrastructure/privacy/retention-repository";

export type PurgeExpiredRejectedSubmissionsResult = {
  journalsScanned: number;
  submissionsPurged: number;
};

export async function purgeExpiredRejectedSubmissions(
  now: Date = new Date(),
): Promise<PurgeExpiredRejectedSubmissionsResult> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const journals = await adminDb.journal.findMany({
    where: {
      isActive: true,
      rejectedSubmissionRetentionDays: { not: null },
    },
    select: {
      id: true,
      rejectedSubmissionRetentionDays: true,
    },
  });

  let submissionsPurged = 0;

  for (const journal of journals) {
    const retentionDays = journal.rejectedSubmissionRetentionDays;
    if (!retentionDays) {
      continue;
    }

    const expired = await listExpiredRejectedSubmissions(
      journal.id,
      retentionDays,
      now,
    );

    for (const submission of expired) {
      await deleteRejectedSubmission(journal.id, submission.id);
      submissionsPurged += 1;
    }
  }

  return {
    journalsScanned: journals.length,
    submissionsPurged,
  };
}
