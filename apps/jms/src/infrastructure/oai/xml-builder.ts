import "server-only";

import {
  buildArticleUrl,
  buildDublinCoreElements,
  buildIssueUrl,
} from "@/domain/oai/dublin-core";
import { buildOaiIdentifier } from "@/domain/oai/identifier";
import {
  DC_NAMESPACE,
  OAI_DC_METADATA_PREFIX,
  OAI_DC_NAMESPACE,
  OAI_DC_SCHEMA,
  OAI_DELETED_RECORD,
  OAI_GRANULARITY,
  OAI_PROTOCOL_VERSION,
  type OaiErrorCode,
  type OaiJournalContext,
  type OaiPublishedRecord,
  type OaiSet,
} from "@/domain/oai/types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatOaiDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function xmlLangAttribute(lang?: string): string {
  return lang ? ` xml:lang="${escapeXml(lang)}"` : "";
}

type RequestAttributes = Record<string, string | undefined>;

function buildRequestAttributes(
  baseUrl: string,
  attributes: RequestAttributes,
): string {
  const parts = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${escapeXml(value!)}"`);
  return parts.length > 0
    ? `<request ${parts.join(" ")}>${escapeXml(baseUrl)}</request>`
    : `<request>${escapeXml(baseUrl)}</request>`;
}

function wrapOaiResponse(
  baseUrl: string,
  requestAttributes: RequestAttributes,
  body: string,
): string {
  const responseDate = formatOaiDate(new Date());
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  ${buildRequestAttributes(baseUrl, requestAttributes)}
  ${body}
</OAI-PMH>`;
}

export function buildOaiErrorXml(
  baseUrl: string,
  code: OaiErrorCode,
  message: string,
  requestAttributes: RequestAttributes = {},
): string {
  return wrapOaiResponse(
    baseUrl,
    requestAttributes,
    `<error code="${code}">${escapeXml(message)}</error>`,
  );
}

export function buildIdentifyXml(
  baseUrl: string,
  journal: OaiJournalContext,
  earliestDatestamp: Date | null,
): string {
  const datestamp = earliestDatestamp
    ? formatOaiDate(earliestDatestamp)
    : formatOaiDate(new Date());
  const body = `<Identify>
    <repositoryName>${escapeXml(journal.repositoryName)}</repositoryName>
    <baseURL>${escapeXml(baseUrl)}</baseURL>
    <protocolVersion>${OAI_PROTOCOL_VERSION}</protocolVersion>
    <adminEmail>${escapeXml(journal.adminEmail)}</adminEmail>
    <earliestDatestamp>${datestamp}</earliestDatestamp>
    <deletedRecord>${OAI_DELETED_RECORD}</deletedRecord>
    <granularity>${OAI_GRANULARITY}</granularity>
  </Identify>`;
  return wrapOaiResponse(baseUrl, { verb: "Identify" }, body);
}

export function buildListMetadataFormatsXml(baseUrl: string): string {
  const body = `<ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>${OAI_DC_METADATA_PREFIX}</metadataPrefix>
      <schema>${OAI_DC_SCHEMA}</schema>
      <metadataNamespace>${OAI_DC_NAMESPACE}</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`;
  return wrapOaiResponse(baseUrl, { verb: "ListMetadataFormats" }, body);
}

export function buildListSetsXml(baseUrl: string, sets: OaiSet[]): string {
  const setXml = sets
    .map(
      (set) => `<set>
      <setSpec>${escapeXml(set.setSpec)}</setSpec>
      <setName>${escapeXml(set.setName)}</setName>
    </set>`,
    )
    .join("\n    ");
  const body = `<ListSets>
    ${setXml}
  </ListSets>`;
  return wrapOaiResponse(baseUrl, { verb: "ListSets" }, body);
}

function buildDublinCoreMetadataXml(
  record: OaiPublishedRecord,
  journal: OaiJournalContext,
  baseSiteUrl: string,
): string {
  const articleUrl = buildArticleUrl(
    baseSiteUrl,
    record.issue?.id ?? null,
    record.submissionId,
  );
  const issueUrl = record.issue
    ? buildIssueUrl(baseSiteUrl, record.issue.id)
    : null;
  const elements = buildDublinCoreElements({
    record,
    journal,
    articleUrl,
    issueUrl,
  });

  const dcXml = elements
    .map(
      (element) =>
        `<dc:${element.name}${xmlLangAttribute(element.lang)}>${escapeXml(element.value)}</dc:${element.name}>`,
    )
    .join("\n        ");

  return `<metadata>
      <oai_dc:dc
        xmlns:oai_dc="${OAI_DC_NAMESPACE}"
        xmlns:dc="${DC_NAMESPACE}"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="${OAI_DC_NAMESPACE} ${OAI_DC_SCHEMA}">
        ${dcXml}
      </oai_dc:dc>
    </metadata>`;
}

function buildRecordHeaderXml(
  record: OaiPublishedRecord,
  repositoryHost: string,
): string {
  const identifier = buildOaiIdentifier(repositoryHost, record.submissionId);
  return `<header>
      <identifier>${escapeXml(identifier)}</identifier>
      <datestamp>${formatOaiDate(record.datestamp)}</datestamp>
      ${record.issue ? `<setSpec>issue:${escapeXml(record.issue.id)}</setSpec>` : ""}
    </header>`;
}

export function buildListIdentifiersXml(
  baseUrl: string,
  records: OaiPublishedRecord[],
  repositoryHost: string,
  requestAttributes: RequestAttributes,
  resumptionToken?: string,
): string {
  const headers = records
    .map((record) => buildRecordHeaderXml(record, repositoryHost))
    .join("\n    ");
  const resumptionXml = resumptionToken
    ? `\n    <resumptionToken>${escapeXml(resumptionToken)}</resumptionToken>`
    : "";
  const body = `<ListIdentifiers>
    ${headers}${resumptionXml}
  </ListIdentifiers>`;
  return wrapOaiResponse(baseUrl, requestAttributes, body);
}

export function buildListRecordsXml(
  baseUrl: string,
  records: OaiPublishedRecord[],
  journal: OaiJournalContext,
  repositoryHost: string,
  baseSiteUrl: string,
  requestAttributes: RequestAttributes,
  resumptionToken?: string,
): string {
  const recordXml = records
    .map((record) => {
      const header = buildRecordHeaderXml(record, repositoryHost);
      const metadata = buildDublinCoreMetadataXml(record, journal, baseSiteUrl);
      return `<record>
      ${header}
      ${metadata}
    </record>`;
    })
    .join("\n    ");

  const resumptionXml = resumptionToken
    ? `\n    <resumptionToken>${escapeXml(resumptionToken)}</resumptionToken>`
    : "";
  const body = `<ListRecords>
    ${recordXml}${resumptionXml}
  </ListRecords>`;
  return wrapOaiResponse(baseUrl, requestAttributes, body);
}

export function buildGetRecordXml(
  baseUrl: string,
  record: OaiPublishedRecord,
  journal: OaiJournalContext,
  repositoryHost: string,
  baseSiteUrl: string,
  metadataPrefix: string,
): string {
  const header = buildRecordHeaderXml(record, repositoryHost);
  const metadata = buildDublinCoreMetadataXml(record, journal, baseSiteUrl);
  const body = `<GetRecord>
    <record>
      ${header}
      ${metadata}
    </record>
  </GetRecord>`;
  return wrapOaiResponse(
    baseUrl,
    { verb: "GetRecord", identifier: buildOaiIdentifier(repositoryHost, record.submissionId), metadataPrefix },
    body,
  );
}
