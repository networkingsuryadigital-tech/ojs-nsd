import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { withTenant } from "@/infrastructure/db/with-tenant";

const listInProductionSubmissionsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type InProductionSubmissionItem = {
  id: string;
  title: string;
  status: string;
  galleyCount: number;
  issueId: string | null;
};

export async function listInProductionSubmissions(
  input: z.infer<typeof listInProductionSubmissionsSchema>,
): Promise<InProductionSubmissionItem[]> {
  const parsed = listInProductionSubmissionsSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR", "COPYEDITOR"],
    "Only editorial staff may list production queue.",
  );

  const submissions = await withTenant(parsed.journalId, (tx) =>
    tx.submission.findMany({
      where: {
        journalId: parsed.journalId,
        status: { in: ["IN_PRODUCTION", "PUBLISHED"] },
      },
      select: {
        id: true,
        status: true,
        issueId: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true },
          take: 1,
        },
        _count: { select: { galleys: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  );

  return submissions.map((submission) => ({
    id: submission.id,
    title: submission.translations[0]?.title ?? "(untitled)",
    status: submission.status,
    galleyCount: submission._count.galleys,
    issueId: submission.issueId,
  }));
}
