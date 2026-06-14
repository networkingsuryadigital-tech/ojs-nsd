import "server-only";

import type { AuditTrailEvent } from "@/domain/compliance/audit-trail";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function loadSubmissionAuditTrailRows(
  journalId: string,
  submissionId: string,
): Promise<{
  submissionStatus: string;
  reviewRound: number;
  title: string | null;
  events: AuditTrailEvent[];
}> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: { id: submissionId, journalId },
      select: {
        status: true,
        reviewRound: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const rows = await tx.editorialEvent.findMany({
      where: { journalId, submissionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        fromStatus: true,
        toStatus: true,
        actorId: true,
        payload: true,
        createdAt: true,
        actor: {
          select: { email: true, name: true },
        },
      },
    });

    return {
      submissionStatus: submission.status,
      reviewRound: submission.reviewRound,
      title: submission.translations[0]?.title ?? null,
      events: rows.map((row) => ({
        id: row.id,
        type: row.type,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        actorId: row.actorId,
        actorEmail: row.actor?.email ?? null,
        actorName: row.actor?.name ?? null,
        payload:
          row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}
