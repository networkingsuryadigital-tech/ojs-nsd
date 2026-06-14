import "server-only";

import { buildDoi, splitAuthorName } from "@/domain/doi/identifier";
import { CROSSREF_SCHEMA_VERSION } from "@/domain/doi/types";

export type CrossRefAuthorInput = {
  fullName: string;
  orcid?: string | null;
  order: number;
};

export type CrossRefDepositXmlInput = {
  batchId: string;
  timestamp: number;
  depositorName: string;
  depositorEmail: string;
  registrant: string;
  journalTitle: string;
  issnOnline?: string | null;
  issnPrint?: string | null;
  volume: number;
  issueNumber: number;
  publicationYear: number;
  publicationDate: Date;
  title: string;
  authors: CrossRefAuthorInput[];
  doiPrefix: string;
  doiSuffix: string;
  resourceUrl: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatOrcid(orcid: string): string {
  const trimmed = orcid.trim();
  if (trimmed.startsWith("https://orcid.org/")) {
    return trimmed;
  }
  const id = trimmed.replace(/^https?:\/\/orcid\.org\//i, "");
  return `https://orcid.org/${id}`;
}

function buildIssnElements(
  issnOnline?: string | null,
  issnPrint?: string | null,
): string {
  const parts: string[] = [];
  if (issnOnline?.trim()) {
    parts.push(
      `<issn media_type="electronic">${escapeXml(issnOnline.trim())}</issn>`,
    );
  }
  if (issnPrint?.trim()) {
    parts.push(`<issn media_type="print">${escapeXml(issnPrint.trim())}</issn>`);
  }
  return parts.join("");
}

function buildContributorElements(authors: CrossRefAuthorInput[]): string {
  const sorted = [...authors].sort((a, b) => a.order - b.order);
  return sorted
    .map((author, index) => {
      const { givenName, surname } = splitAuthorName(author.fullName);
      const sequence = index === 0 ? "first" : "additional";
      const orcid =
        author.orcid?.trim() ?
          `<ORCID authenticated="false">${escapeXml(formatOrcid(author.orcid))}</ORCID>`
        : "";
      return `<person_name sequence="${sequence}" contributor_role="author">
            <given_name>${escapeXml(givenName)}</given_name>
            <surname>${escapeXml(surname)}</surname>
            ${orcid}
          </person_name>`;
    })
    .join("");
}

export type CrossRefUpdateXmlInput = CrossRefDepositXmlInput & {
  updateDescription: string;
  updateType: "retraction" | "correction";
  updateDate: Date;
};

function buildJournalArticleBody(input: CrossRefDepositXmlInput): string {
  const doi = buildDoi(input.doiPrefix, input.doiSuffix);
  const pubDate = input.publicationDate;
  const month = pubDate.getUTCMonth() + 1;
  const day = pubDate.getUTCDate();

  return `<journal_metadata language="en">
        <full_title>${escapeXml(input.journalTitle)}</full_title>
        ${buildIssnElements(input.issnOnline, input.issnPrint)}
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <year>${input.publicationYear}</year>
        </publication_date>
        <journal_volume>
          <volume>${input.volume}</volume>
        </journal_volume>
        <issue>${input.issueNumber}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles>
          <title>${escapeXml(input.title)}</title>
        </titles>
        <contributors>
          ${buildContributorElements(input.authors)}
        </contributors>
        <publication_date media_type="online">
          <year>${pubDate.getUTCFullYear()}</year>
          <month>${month}</month>
          <day>${day}</day>
        </publication_date>
        <doi_data>
          <doi>${escapeXml(doi)}</doi>
          <resource>${escapeXml(input.resourceUrl)}</resource>
        </doi_data>
      </journal_article>`;
}

export function buildCrossRefUpdateXml(input: CrossRefUpdateXmlInput): string {
  const updateDate = input.updateDate.toISOString().slice(0, 10).replace(/-/g, "");
  const articleBody = buildJournalArticleBody(input);
  const updateBlock = `<update type="${input.updateType}" date="${updateDate}">
          <description>${escapeXml(input.updateDescription)}</description>
        </update>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="${CROSSREF_SCHEMA_VERSION}" xmlns="http://www.crossref.org/schema/${CROSSREF_SCHEMA_VERSION}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/${CROSSREF_SCHEMA_VERSION} http://www.crossref.org/schema/deposit/crossref${CROSSREF_SCHEMA_VERSION}.xsd">
  <head>
    <doi_batch_id>${escapeXml(input.batchId)}</doi_batch_id>
    <timestamp>${input.timestamp}</timestamp>
    <depositor>
      <depositor_name>${escapeXml(input.depositorName)}</depositor_name>
      <email_address>${escapeXml(input.depositorEmail)}</email_address>
    </depositor>
    <registrant>${escapeXml(input.registrant)}</registrant>
  </head>
  <body>
    <journal>
      ${articleBody.replace(
        "</publication_date>",
        `</publication_date>
        ${updateBlock}`,
      )}
    </journal>
  </body>
</doi_batch>`;
}

export function buildCrossRefDepositXml(input: CrossRefDepositXmlInput): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="${CROSSREF_SCHEMA_VERSION}" xmlns="http://www.crossref.org/schema/${CROSSREF_SCHEMA_VERSION}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/${CROSSREF_SCHEMA_VERSION} http://www.crossref.org/schema/deposit/crossref${CROSSREF_SCHEMA_VERSION}.xsd">
  <head>
    <doi_batch_id>${escapeXml(input.batchId)}</doi_batch_id>
    <timestamp>${input.timestamp}</timestamp>
    <depositor>
      <depositor_name>${escapeXml(input.depositorName)}</depositor_name>
      <email_address>${escapeXml(input.depositorEmail)}</email_address>
    </depositor>
    <registrant>${escapeXml(input.registrant)}</registrant>
  </head>
  <body>
    <journal>
      ${buildJournalArticleBody(input)}
    </journal>
  </body>
</doi_batch>`;
}
