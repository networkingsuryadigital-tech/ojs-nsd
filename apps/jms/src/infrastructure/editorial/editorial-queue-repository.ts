import "server-only";

import type { SubmissionStatus } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type EditorialQueueItem = {
  id: string;
  title: string;
  status: SubmissionStatus;
  reviewRound: number;
  updatedAt: Date;
  submittedAt: Date | null;
  sectionTitle: string | null;
  correspondingAuthorName: string | null;
  overdueAssignmentCount: number;
};

export type ListEditorialQueueFromDbInput = {
  journalId: string;
  statuses?: readonly SubmissionStatus[];
  overdueOnly?: boolean;
  take?: number;
};

export type EditorialQueueListResult = {
  items: EditorialQueueItem[];
  hasMore: boolean;
};

const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;

export async function listEditorialQueueFromDb(
  input: ListEditorialQueueFromDbInput,
): Promise<EditorialQueueListResult> {
  const take = Math.min(Math.max(input.take ?? DEFAULT_TAKE, 1), MAX_TAKE);

  return withTenant(input.journalId, async (tx) => {
    const rows = await tx.submission.findMany({
      where: {
        journalId: input.journalId,
        ...(input.statuses ? { status: { in: [...input.statuses] } } : {}),
        ...(input.overdueOnly
          ? { reviewAssignments: { some: { status: "OVERDUE" } } }
          : {}),
      },
      select: {
        id: true,
        status: true,
        reviewRound: true,
        updatedAt: true,
        submittedAt: true,
        section: { select: { title: true } },
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
        authors: {
          select: { fullName: true, isCorresponding: true, order: true },
          orderBy: [{ isCorresponding: "desc" }, { order: "asc" }],
          take: 1,
        },
        reviewAssignments: {
          where: { status: "OVERDUE" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const items = rows.slice(0, take).map((row) => ({
      id: row.id,
      title: row.translations[0]?.title.trim() || "(tanpa judul)",
      status: row.status as SubmissionStatus,
      reviewRound: row.reviewRound,
      updatedAt: row.updatedAt,
      submittedAt: row.submittedAt,
      sectionTitle: row.section?.title ?? null,
      correspondingAuthorName: row.authors[0]?.fullName ?? null,
      overdueAssignmentCount: row.reviewAssignments.length,
    }));

    return { items, hasMore };
  });
}
