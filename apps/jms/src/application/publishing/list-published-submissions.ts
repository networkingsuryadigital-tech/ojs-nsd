import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { withTenant } from "@/infrastructure/db/with-tenant";

const listPublishedSubmissionsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type PublishedSubmissionListItem = {
  id: string;
  title: string;
  status: "PUBLISHED" | "RETRACTED";
  doi: string | null;
  publicationNoticeType: "RETRACTION" | "CORRECTION" | "ERRATUM" | null;
  publicationNoticeReason: string | null;
};

export async function listPublishedSubmissions(
  input: z.infer<typeof listPublishedSubmissionsSchema>,
): Promise<PublishedSubmissionListItem[]> {
  const parsed = listPublishedSubmissionsSchema.parse(input);
  const roles = await resolveJournalRoles(parsed.journalId, parsed.actorId);
  const allowed =
    roles.includes("JOURNAL_ADMIN") || roles.includes("EDITOR_IN_CHIEF");
  if (!allowed) {
    throw new SubmissionAuthorizationError();
  }

  const submissions = await withTenant(parsed.journalId, (tx) =>
    tx.submission.findMany({
      where: {
        journalId: parsed.journalId,
        status: { in: ["PUBLISHED", "RETRACTED"] },
      },
      select: {
        id: true,
        status: true,
        doi: true,
        publicationNoticeType: true,
        publicationNoticeReason: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
  );

  return submissions.map((submission) => ({
    id: submission.id,
    title: submission.translations[0]?.title ?? "(tanpa judul)",
    status: submission.status as "PUBLISHED" | "RETRACTED",
    doi: submission.doi,
    publicationNoticeType: submission.publicationNoticeType,
    publicationNoticeReason: submission.publicationNoticeReason,
  }));
}
