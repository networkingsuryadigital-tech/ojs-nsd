import "server-only";

import { z } from "zod";

import { withTenant } from "@/infrastructure/db/with-tenant";

const schema = z.object({
  journalId: z.string().trim().min(1),
  query: z.string().trim().max(200),
});

export type PublishedSearchHit = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
};

export async function searchPublishedArticles(
  input: z.infer<typeof schema>,
): Promise<PublishedSearchHit[]> {
  const parsed = schema.parse(input);
  const q = parsed.query.trim();
  if (q.length < 2) {
    return [];
  }

  return withTenant(parsed.journalId, async (tx) => {
    const rows = await tx.submission.findMany({
      where: {
        journalId: parsed.journalId,
        status: "PUBLISHED",
        translations: {
          some: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { abstract: { contains: q, mode: "insensitive" } },
              { keywords: { has: q } },
            ],
          },
        },
      },
      select: {
        id: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true, abstract: true },
          take: 1,
        },
        authors: {
          select: { fullName: true },
          orderBy: { order: "asc" },
        },
      },
      take: 40,
      orderBy: { publishedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.translations[0]?.title ?? "(untitled)",
      abstract: row.translations[0]?.abstract ?? "",
      authors: row.authors.map((author) => author.fullName),
    }));
  });
}
