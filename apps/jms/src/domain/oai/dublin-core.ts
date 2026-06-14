import { formatIssueCitation } from "@/domain/publishing/issue";
import {
  DEFAULT_ARTICLE_RIGHTS,
  DEFAULT_ARTICLE_TYPE,
  type OaiJournalContext,
  type OaiPublishedRecord,
} from "@/domain/oai/types";

export type DublinCoreElement = {
  name: string;
  value: string;
  lang?: string;
};

export type DublinCoreBuildInput = {
  record: OaiPublishedRecord;
  journal: OaiJournalContext;
  articleUrl: string;
  issueUrl: string | null;
};

function formatIssnSource(
  journal: OaiJournalContext,
  issueCitation: string | null,
): string {
  const parts = [journal.journalName];
  if (issueCitation) {
    parts.push(issueCitation);
  }
  const issn = journal.issnOnline ?? journal.issnPrint;
  if (issn) {
    parts.push(`ISSN ${issn}`);
  }
  return parts.join("; ");
}

export function buildDublinCoreElements(
  input: DublinCoreBuildInput,
): DublinCoreElement[] {
  const { record, journal, articleUrl, issueUrl } = input;
  const elements: DublinCoreElement[] = [];

  for (const translation of record.translations) {
    elements.push({
      name: "title",
      value: translation.title,
      lang: translation.language,
    });
  }

  for (const author of [...record.authors].sort((a, b) => a.order - b.order)) {
    elements.push({ name: "creator", value: author.fullName });
  }

  for (const translation of record.translations) {
    for (const keyword of translation.keywords) {
      const trimmed = keyword.trim();
      if (!trimmed) continue;
      elements.push({
        name: "subject",
        value: trimmed,
        lang: translation.language,
      });
    }
  }

  if (record.publicationNoticeDescription) {
    elements.push({
      name: "description",
      value: record.publicationNoticeDescription,
    });
  }

  for (const translation of record.translations) {
    const abstract = translation.abstract.trim();
    if (!abstract) continue;
    elements.push({
      name: "description",
      value: abstract,
      lang: translation.language,
    });
  }

  if (record.status === "RETRACTED") {
    elements.push({ name: "type", value: "retracted article" });
  }

  if (journal.publisher) {
    elements.push({ name: "publisher", value: journal.publisher });
  }

  const publishedAt = record.publishedAt ?? record.datestamp;
  elements.push({ name: "date", value: publishedAt.toISOString().slice(0, 10) });
  if (record.status !== "RETRACTED") {
    elements.push({ name: "type", value: DEFAULT_ARTICLE_TYPE });
  }

  for (const galley of record.galleys) {
    elements.push({ name: "format", value: galley.mimeType });
  }

  if (record.doi) {
    elements.push({ name: "identifier", value: `doi:${record.doi}` });
  }
  elements.push({ name: "identifier", value: articleUrl });

  const issueCitation = record.issue
    ? formatIssueCitation(record.issue)
    : null;
  elements.push({
    name: "source",
    value: formatIssnSource(journal, issueCitation),
  });

  elements.push({ name: "language", value: record.primaryLanguage });

  if (issueUrl) {
    elements.push({ name: "relation", value: issueUrl });
  }

  elements.push({ name: "rights", value: DEFAULT_ARTICLE_RIGHTS });

  return elements;
}

export function buildArticleUrl(
  baseSiteUrl: string,
  issueId: string | null,
  submissionId: string,
): string {
  const base = baseSiteUrl.replace(/\/$/, "");
  if (issueId) {
    return `${base}/issues/${issueId}#article-${submissionId}`;
  }
  return `${base}/issues#article-${submissionId}`;
}

export function buildIssueUrl(
  baseSiteUrl: string,
  issueId: string,
): string {
  const base = baseSiteUrl.replace(/\/$/, "");
  return `${base}/issues/${issueId}`;
}
