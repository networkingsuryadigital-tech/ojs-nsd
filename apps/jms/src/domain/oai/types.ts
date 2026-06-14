/** Pure OAI-PMH domain types — no I/O imports. */

export const OAI_VERBS = [
  "Identify",
  "ListMetadataFormats",
  "ListSets",
  "ListIdentifiers",
  "ListRecords",
  "GetRecord",
] as const;

export type OaiVerb = (typeof OAI_VERBS)[number];

export const OAI_ERROR_CODES = [
  "badArgument",
  "badResumptionToken",
  "badVerb",
  "cannotDisseminateFormat",
  "idDoesNotExist",
  "noRecordsMatch",
  "noSetHierarchy",
  "noMetadataFormats",
] as const;

export type OaiErrorCode = (typeof OAI_ERROR_CODES)[number];

export const OAI_DC_METADATA_PREFIX = "oai_dc" as const;

export const OAI_DC_SCHEMA =
  "http://www.openarchives.org/OAI/2.0/oai_dc.xsd";

export const OAI_DC_NAMESPACE = "http://www.openarchives.org/OAI/2.0/oai_dc/";

export const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/";

export const OAI_PROTOCOL_VERSION = "2.0";

export const OAI_GRANULARITY = "YYYY-MM-DDThh:mm:ssZ";

export const OAI_DELETED_RECORD = "no";

export const OAI_PAGE_SIZE = 100;

export const DEFAULT_ARTICLE_RIGHTS =
  "https://creativecommons.org/licenses/by/4.0/";

export const DEFAULT_ARTICLE_TYPE = "article";

export type OaiTranslation = {
  language: string;
  title: string;
  abstract: string;
  keywords: string[];
};

export type OaiAuthor = {
  fullName: string;
  order: number;
};

export type OaiGalley = {
  mimeType: string;
};

export type OaiIssueRef = {
  id: string;
  volume: number;
  number: number;
  year: number;
};

export type OaiPublishedRecord = {
  submissionId: string;
  datestamp: Date;
  primaryLanguage: string;
  publishedAt: Date | null;
  doi: string | null;
  status: "PUBLISHED" | "RETRACTED";
  publicationNoticeDescription: string | null;
  translations: OaiTranslation[];
  authors: OaiAuthor[];
  galleys: OaiGalley[];
  issue: OaiIssueRef | null;
};

export type OaiJournalContext = {
  journalId: string;
  repositoryName: string;
  journalName: string;
  publisher: string | null;
  issnPrint: string | null;
  issnOnline: string | null;
  adminEmail: string;
};

export type OaiSet = {
  setSpec: string;
  setName: string;
};

export type OaiListFilters = {
  from?: Date;
  until?: Date;
  set?: string;
};

export type OaiResumptionState = {
  journalId: string;
  verb: "ListIdentifiers" | "ListRecords";
  metadataPrefix: string;
  filters: OaiListFilters;
  cursor?: string;
  cacheVersion: number;
};
