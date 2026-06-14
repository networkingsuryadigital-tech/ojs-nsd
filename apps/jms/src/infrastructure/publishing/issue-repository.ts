import "server-only";

import { formatIssueCitation } from "@/domain/publishing/issue";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type IssueRecord = {
  id: string;
  journalId: string;
  volume: number;
  number: number;
  year: number;
  title: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
};

export async function createIssueRecord(
  journalId: string,
  data: {
    volume: number;
    number: number;
    year: number;
    title?: string;
  },
): Promise<IssueRecord> {
  return withTenant(journalId, (tx) =>
    tx.issue.create({
      data: {
        journalId,
        volume: data.volume,
        number: data.number,
        year: data.year,
        title: data.title,
      },
      select: {
        id: true,
        journalId: true,
        volume: true,
        number: true,
        year: true,
        title: true,
        isPublished: true,
        publishedAt: true,
      },
    }),
  );
}

export async function findIssueInJournal(
  journalId: string,
  issueId: string,
): Promise<IssueRecord | null> {
  return withTenant(journalId, (tx) =>
    tx.issue.findFirst({
      where: { id: issueId, journalId },
      select: {
        id: true,
        journalId: true,
        volume: true,
        number: true,
        year: true,
        title: true,
        isPublished: true,
        publishedAt: true,
      },
    }),
  );
}

export async function listIssuesInJournal(
  journalId: string,
  options?: { publishedOnly?: boolean },
): Promise<IssueRecord[]> {
  return withTenant(journalId, (tx) =>
    tx.issue.findMany({
      where: {
        journalId,
        ...(options?.publishedOnly ? { isPublished: true } : {}),
      },
      select: {
        id: true,
        journalId: true,
        volume: true,
        number: true,
        year: true,
        title: true,
        isPublished: true,
        publishedAt: true,
      },
      orderBy: [{ year: "desc" }, { volume: "desc" }, { number: "desc" }],
    }),
  );
}

export async function publishIssueRecord(
  journalId: string,
  issueId: string,
): Promise<IssueRecord> {
  return withTenant(journalId, (tx) =>
    tx.issue.update({
      where: { id: issueId, journalId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        journalId: true,
        volume: true,
        number: true,
        year: true,
        title: true,
        isPublished: true,
        publishedAt: true,
      },
    }),
  );
}

export type PublishedArticleRecord = {
  id: string;
  publishedAt: Date | null;
  title: string;
  abstract: string;
  authors: Array<{ fullName: string; affiliation: string | null }>;
  galleys: Array<{ id: string; label: string; mimeType: string }>;
};

export async function listPublishedArticlesInIssue(
  journalId: string,
  issueId: string,
): Promise<PublishedArticleRecord[]> {
  return withTenant(journalId, async (tx) => {
    const submissions = await tx.submission.findMany({
      where: {
        journalId,
        issueId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        publishedAt: true,
        translations: {
          where: { isPrimary: true },
          select: { title: true, abstract: true },
          take: 1,
        },
        authors: {
          select: { fullName: true, affiliation: true },
          orderBy: { order: "asc" },
        },
        galleys: {
          select: { id: true, label: true, mimeType: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { publishedAt: "asc" },
    });

    return submissions.map((submission) => {
      const primary = submission.translations[0];
      return {
        id: submission.id,
        publishedAt: submission.publishedAt,
        title: primary?.title ?? "(untitled)",
        abstract: primary?.abstract ?? "",
        authors: submission.authors,
        galleys: submission.galleys,
      };
    });
  });
}

export type PublishedArticleDetailRecord = {
  id: string;
  doi: string | null;
  publishedAt: Date | null;
  issueCitation: string | null;
  translations: Array<{
    language: string;
    title: string;
    abstract: string;
    keywords: string[];
    isPrimary: boolean;
  }>;
  authors: Array<{ fullName: string; affiliation: string | null; orcid: string | null }>;
  galleys: Array<{ id: string; label: string; mimeType: string }>;
};

export async function findPublishedArticleInJournal(
  journalId: string,
  submissionId: string,
): Promise<PublishedArticleDetailRecord | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: {
        id: submissionId,
        journalId,
        status: { in: ["PUBLISHED", "RETRACTED"] },
      },
      select: {
        id: true,
        doi: true,
        publishedAt: true,
        issue: {
          select: { volume: true, number: true, year: true, title: true },
        },
        translations: {
          select: {
            language: true,
            title: true,
            abstract: true,
            keywords: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: "desc" },
        },
        authors: {
          select: { fullName: true, affiliation: true, orcid: true },
          orderBy: { order: "asc" },
        },
        galleys: {
          select: { id: true, label: true, mimeType: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!submission) {
      return null;
    }

    const issueCitation = submission.issue
      ? formatIssueCitation(submission.issue)
      : null;

    return {
      id: submission.id,
      doi: submission.doi,
      publishedAt: submission.publishedAt,
      issueCitation,
      translations: submission.translations,
      authors: submission.authors,
      galleys: submission.galleys,
    };
  });
}
