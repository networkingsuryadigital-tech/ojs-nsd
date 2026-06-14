import "server-only";

import { z } from "zod";

import { findPublishedArticleInJournal } from "@/infrastructure/publishing/issue-repository";

const getPublishedArticleSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
});

export type PublishedArticlePublic = NonNullable<
  Awaited<ReturnType<typeof getPublishedArticle>>
>;

export async function getPublishedArticle(
  input: z.infer<typeof getPublishedArticleSchema>,
) {
  const parsed = getPublishedArticleSchema.parse(input);
  return findPublishedArticleInJournal(parsed.journalId, parsed.submissionId);
}

export function buildCitationText(article: {
  authors: Array<{ fullName: string }>;
  translations: Array<{ title: string; isPrimary: boolean }>;
  issueCitation: string | null;
  doi: string | null;
}): string {
  const primary =
    article.translations.find((t) => t.isPrimary) ?? article.translations[0];
  const authorLine = article.authors.map((a) => a.fullName).join(", ");
  const parts = [
    authorLine,
    primary?.title ? `"${primary.title}"` : null,
    article.issueCitation,
    article.doi ? `https://doi.org/${article.doi}` : null,
  ].filter(Boolean);
  return parts.join(". ") + ".";
}
