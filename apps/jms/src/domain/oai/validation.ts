import type { OaiPublishedRecord } from "@/domain/oai/types";

export type OaiXmlValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export type OaiRecordValidationResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

export function validateOaiResponseXml(xml: string): OaiXmlValidationResult {
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<?xml")) {
    return { ok: false, reason: "Missing XML declaration." };
  }
  if (!trimmed.includes('xmlns="http://www.openarchives.org/OAI/2.0/"')) {
    return { ok: false, reason: "Missing OAI-PMH 2.0 namespace." };
  }
  if (!/<OAI-PMH[\s>]/.test(trimmed)) {
    return { ok: false, reason: "Missing OAI-PMH root element." };
  }
  if (!/<responseDate>/.test(trimmed)) {
    return { ok: false, reason: "Missing responseDate." };
  }
  if (!/<request[\s>]/.test(trimmed)) {
    return { ok: false, reason: "Missing request element." };
  }
  const hasVerbResponse =
    /<(Identify|ListMetadataFormats|ListSets|ListIdentifiers|ListRecords|GetRecord|error)\b/.test(
      trimmed,
    );
  if (!hasVerbResponse) {
    return { ok: false, reason: "Missing verb response or error element." };
  }
  return { ok: true };
}

export function validateOaiDcRecordXml(xml: string): OaiXmlValidationResult {
  const base = validateOaiResponseXml(xml);
  if (!base.ok) {
    return base;
  }
  if (!xml.includes('xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"')) {
    return { ok: false, reason: "Missing oai_dc namespace." };
  }
  if (!xml.includes('xmlns:dc="http://purl.org/dc/elements/1.1/"')) {
    return { ok: false, reason: "Missing dc namespace." };
  }
  if (!/<oai_dc:dc\b/.test(xml)) {
    return { ok: false, reason: "Missing oai_dc:dc metadata wrapper." };
  }
  if (!/<dc:title\b/.test(xml)) {
    return { ok: false, reason: "Missing dc:title." };
  }
  return { ok: true };
}

export function validatePublishedRecordForHarvest(
  record: OaiPublishedRecord,
): OaiRecordValidationResult {
  const reasons: string[] = [];

  if (record.translations.length === 0) {
    reasons.push("At least one translation is required.");
  }
  for (const translation of record.translations) {
    if (!translation.title.trim()) {
      reasons.push(`Title missing for language ${translation.language}.`);
    }
  }
  if (record.authors.length === 0) {
    reasons.push("At least one author is required.");
  }
  if (!record.publishedAt && !record.datestamp) {
    reasons.push("Published date is required.");
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }
  return { ok: true };
}
