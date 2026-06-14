import "server-only";

import { formatPublicationNoticeDescription } from "@/domain/publication/notice";
import { formatIssueCitation } from "@/domain/publishing/issue";
import { buildIssueSetSpec, parseIssueSetSpec } from "@/domain/oai/identifier";
import type {
  OaiJournalContext,
  OaiListFilters,
  OaiPublishedRecord,
  OaiSet,
} from "@/domain/oai/types";
import type { SubmissionStatus } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

const OAI_HARVEST_STATUSES: SubmissionStatus[] = ["PUBLISHED", "RETRACTED"];

const DEFAULT_ADMIN_EMAIL = "noreply@nsd.id";

function mapSubmissionToOaiRecord(
  submission: {
    id: string;
    primaryLanguage: string;
    publishedAt: Date | null;
    updatedAt: Date;
    doi: string | null;
    status: SubmissionStatus;
    publicationNoticeType: "RETRACTION" | "CORRECTION" | "ERRATUM" | null;
    publicationNoticeReason: string | null;
    translations: Array<{
      language: string;
      title: string;
      abstract: string;
      keywords: string[];
    }>;
    authors: Array<{ fullName: string; order: number }>;
    galleys: Array<{ mimeType: string }>;
    issue: {
      id: string;
      volume: number;
      number: number;
      year: number;
      isPublished: boolean;
    } | null;
  },
): OaiPublishedRecord {
  const datestamp = submission.publishedAt ?? submission.updatedAt;
  return {
    submissionId: submission.id,
    datestamp,
    primaryLanguage: submission.primaryLanguage,
    publishedAt: submission.publishedAt,
    doi: submission.doi,
    status:
      submission.status === "RETRACTED" ? "RETRACTED" : "PUBLISHED",
    publicationNoticeDescription:
      submission.publicationNoticeType && submission.publicationNoticeReason
        ? formatPublicationNoticeDescription(
            submission.publicationNoticeType,
            submission.publicationNoticeReason,
          )
        : null,
    translations: submission.translations,
    authors: submission.authors,
    galleys: submission.galleys,
    issue:
      submission.issue && submission.issue.isPublished
        ? {
            id: submission.issue.id,
            volume: submission.issue.volume,
            number: submission.issue.number,
            year: submission.issue.year,
          }
        : null,
  };
}

const publishedSubmissionSelect = {
  id: true,
  primaryLanguage: true,
  publishedAt: true,
  updatedAt: true,
  doi: true,
  status: true,
  publicationNoticeType: true,
  publicationNoticeReason: true,
  translations: {
    select: {
      language: true,
      title: true,
      abstract: true,
      keywords: true,
    },
    orderBy: { language: "asc" as const },
  },
  authors: {
    select: { fullName: true, order: true },
    orderBy: { order: "asc" as const },
  },
  galleys: {
    select: { mimeType: true },
    orderBy: { createdAt: "asc" as const },
  },
  issue: {
    select: {
      id: true,
      volume: true,
      number: true,
      year: true,
      isPublished: true,
    },
  },
};

function buildDateFilters(filters: OaiListFilters) {
  const publishedAt: { gte?: Date; lte?: Date } = {};
  if (filters.from) {
    publishedAt.gte = filters.from;
  }
  if (filters.until) {
    publishedAt.lte = filters.until;
  }
  return Object.keys(publishedAt).length > 0 ? { publishedAt } : {};
}

function buildIssueFilter(filters: OaiListFilters) {
  if (!filters.set) {
    return {};
  }
  const parsed = parseIssueSetSpec(filters.set);
  if (!parsed.ok) {
    return { invalidSet: true as const };
  }
  return { issueId: parsed.issueId };
}

export async function fetchOaiJournalContext(
  journalId: string,
): Promise<OaiJournalContext | null> {
  return withTenant(journalId, async (tx) => {
    const journal = await tx.journal.findFirst({
      where: { id: journalId, isActive: true },
      select: {
        id: true,
        name: true,
        publisher: true,
        issnPrint: true,
        issnOnline: true,
        oaiRepoName: true,
        theme: {
          select: { emailFromAddress: true },
        },
      },
    });
    if (!journal) {
      return null;
    }
    return {
      journalId: journal.id,
      repositoryName: journal.oaiRepoName ?? journal.name,
      journalName: journal.name,
      publisher: journal.publisher,
      issnPrint: journal.issnPrint,
      issnOnline: journal.issnOnline,
      adminEmail: journal.theme?.emailFromAddress ?? DEFAULT_ADMIN_EMAIL,
    };
  });
}

export async function fetchEarliestPublishedDatestamp(
  journalId: string,
): Promise<Date | null> {
  return withTenant(journalId, async (tx) => {
    const row = await tx.submission.findFirst({
      where: { journalId, status: { in: ["PUBLISHED", "RETRACTED"] } },
      orderBy: { publishedAt: "asc" },
      select: { publishedAt: true, updatedAt: true },
    });
    if (!row) {
      return null;
    }
    return row.publishedAt ?? row.updatedAt;
  });
}

export async function listOaiSets(journalId: string): Promise<OaiSet[]> {
  return withTenant(journalId, async (tx) => {
    const issues = await tx.issue.findMany({
      where: { journalId, isPublished: true },
      select: { id: true, volume: true, number: true, year: true },
      orderBy: [{ year: "desc" }, { volume: "desc" }, { number: "desc" }],
    });
    return issues.map((issue) => ({
      setSpec: buildIssueSetSpec(issue.id),
      setName: formatIssueCitation(issue),
    }));
  });
}

export async function issueSetExists(
  journalId: string,
  setSpec: string,
): Promise<boolean> {
  const parsed = parseIssueSetSpec(setSpec);
  if (!parsed.ok) {
    return false;
  }
  return withTenant(journalId, async (tx) => {
    const issue = await tx.issue.findFirst({
      where: { id: parsed.issueId, journalId, isPublished: true },
      select: { id: true },
    });
    return issue !== null;
  });
}

export type ListOaiRecordsResult = {
  records: OaiPublishedRecord[];
  hasMore: boolean;
  nextCursor?: string;
  noRecordsMatch?: boolean;
};

export async function listOaiPublishedRecords(
  journalId: string,
  filters: OaiListFilters,
  options: { cursor?: string; limit: number },
): Promise<ListOaiRecordsResult> {
  const issueFilter = buildIssueFilter(filters);
  if ("invalidSet" in issueFilter) {
    return { records: [], hasMore: false, noRecordsMatch: true };
  }

  if (filters.set) {
    const exists = await issueSetExists(journalId, filters.set);
    if (!exists) {
      return { records: [], hasMore: false, noRecordsMatch: true };
    }
  }

  return withTenant(journalId, async (tx) => {
    const where = {
      journalId,
      status: { in: OAI_HARVEST_STATUSES },
      ...buildDateFilters(filters),
      ...(issueFilter.issueId ? { issueId: issueFilter.issueId } : {}),
    };

    const submissions = await tx.submission.findMany({
      where,
      select: publishedSubmissionSelect,
      orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
      take: options.limit + 1,
    });

    const hasMore = submissions.length > options.limit;
    const page = hasMore ? submissions.slice(0, options.limit) : submissions;
    const records = page.map(mapSubmissionToOaiRecord);

    return {
      records,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
      noRecordsMatch: records.length === 0 && !options.cursor,
    };
  });
}

export async function getOaiPublishedRecord(
  journalId: string,
  submissionId: string,
): Promise<OaiPublishedRecord | null> {
  return withTenant(journalId, async (tx) => {
    const submission = await tx.submission.findFirst({
      where: {
        id: submissionId,
        journalId,
        status: { in: OAI_HARVEST_STATUSES },
      },
      select: publishedSubmissionSelect,
    });
    if (!submission) {
      return null;
    }
    return mapSubmissionToOaiRecord(submission);
  });
}
