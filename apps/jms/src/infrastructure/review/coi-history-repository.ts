import "server-only";

import type { PriorCoAuthorPublication } from "@/domain/review/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

const AUTHOR_ROLES = ["AUTHOR", "CORRESPONDING_AUTHOR"] as const;

export async function listPriorCoAuthorPublications(
  journalId: string,
  submissionId: string,
  reviewerUserId: string,
  currentAuthorUserIds: string[],
): Promise<PriorCoAuthorPublication[]> {
  if (currentAuthorUserIds.length === 0) {
    return [];
  }

  const submissions = await withTenant(journalId, (tx) =>
    tx.submission.findMany({
      where: {
        journalId,
        id: { not: submissionId },
        status: { in: ["PUBLISHED", "RETRACTED"] },
        AND: [
          {
            participants: {
              some: {
                userId: reviewerUserId,
                role: { in: [...AUTHOR_ROLES] },
              },
            },
          },
          {
            participants: {
              some: {
                userId: { in: currentAuthorUserIds },
                role: { in: [...AUTHOR_ROLES] },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        publishedAt: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  );

  return submissions.map((submission) => ({
    submissionId: submission.id,
    title: submission.translations[0]?.title ?? "(tanpa judul)",
    publishedAt: submission.publishedAt
      ? submission.publishedAt.toISOString().slice(0, 10)
      : null,
  }));
}
