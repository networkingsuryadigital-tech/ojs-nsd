import "server-only";

import { z } from "zod";

import { formatIssueCitation } from "@/domain/publishing/issue";
import {
  listIssuesInJournal,
  listPublishedArticlesInIssue,
  findIssueInJournal,
} from "@/infrastructure/publishing/issue-repository";

const listPublishedIssuesSchema = z.object({
  journalId: z.string().trim().min(1),
});

export type PublishedIssueSummary = {
  id: string;
  citation: string;
  title: string | null;
  publishedAt: Date | null;
};

export async function listPublishedIssues(
  input: z.infer<typeof listPublishedIssuesSchema>,
): Promise<PublishedIssueSummary[]> {
  const parsed = listPublishedIssuesSchema.parse(input);
  const issues = await listIssuesInJournal(parsed.journalId, { publishedOnly: true });

  return issues.map((issue) => ({
    id: issue.id,
    citation: formatIssueCitation(issue),
    title: issue.title,
    publishedAt: issue.publishedAt,
  }));
}

const getPublishedIssueSchema = z.object({
  journalId: z.string().trim().min(1),
  issueId: z.string().trim().min(1),
});

export type PublishedIssueDetail = {
  id: string;
  citation: string;
  title: string | null;
  publishedAt: Date | null;
  articles: Awaited<ReturnType<typeof listPublishedArticlesInIssue>>;
};

export async function getPublishedIssue(
  input: z.infer<typeof getPublishedIssueSchema>,
): Promise<PublishedIssueDetail | null> {
  const parsed = getPublishedIssueSchema.parse(input);
  const issue = await findIssueInJournal(parsed.journalId, parsed.issueId);
  if (!issue?.isPublished) {
    return null;
  }

  const articles = await listPublishedArticlesInIssue(
    parsed.journalId,
    parsed.issueId,
  );

  return {
    id: issue.id,
    citation: formatIssueCitation(issue),
    title: issue.title,
    publishedAt: issue.publishedAt,
    articles,
  };
}
