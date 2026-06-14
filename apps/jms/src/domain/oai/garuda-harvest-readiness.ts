import { buildDublinCoreElements } from "@/domain/oai/dublin-core";
import type { OaiJournalContext, OaiPublishedRecord } from "@/domain/oai/types";
import {
  validateOaiDcRecordXml,
  validateOaiResponseXml,
  validatePublishedRecordForHarvest,
} from "@/domain/oai/validation";

export type GarudaHarvestCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export function evaluateGarudaJournalConfig(
  journal: Pick<OaiJournalContext, "issnOnline" | "issnPrint" | "journalName">,
): GarudaHarvestCheck[] {
  const checks: GarudaHarvestCheck[] = [];
  const hasIssn = Boolean(journal.issnOnline?.trim() || journal.issnPrint?.trim());

  checks.push({
    id: "journal_issn",
    label: "ISSN jurnal terkonfigurasi",
    passed: hasIssn,
    detail: hasIssn
      ? undefined
      : "Isi issnOnline atau issnPrint pada pengaturan jurnal.",
  });

  checks.push({
    id: "journal_name",
    label: "Nama jurnal tersedia",
    passed: Boolean(journal.journalName.trim()),
  });

  return checks;
}

export function evaluateGarudaPublishedInventory(
  publishedRecordCount: number,
): GarudaHarvestCheck {
  return {
    id: "published_records",
    label: "Minimal satu artikel terbit",
    passed: publishedRecordCount > 0,
    detail:
      publishedRecordCount > 0
        ? `${publishedRecordCount} record siap harvest`
        : "Belum ada artikel PUBLISHED/RETRACTED.",
  };
}

export function evaluateGarudaRecordSamples(input: {
  records: OaiPublishedRecord[];
  journal: OaiJournalContext;
  articleUrlBase: string;
}): GarudaHarvestCheck[] {
  const checks: GarudaHarvestCheck[] = [];

  if (input.records.length === 0) {
    return checks;
  }

  for (const record of input.records.slice(0, 3)) {
    const harvest = validatePublishedRecordForHarvest(record);
    checks.push({
      id: `record_${record.submissionId}_harvest`,
      label: `Metadata record ${record.submissionId}`,
      passed: harvest.ok,
      detail: harvest.ok ? undefined : harvest.reasons.join("; "),
    });

    const elements = buildDublinCoreElements({
      record,
      journal: input.journal,
      articleUrl: `${input.articleUrlBase}/issues#article-${record.submissionId}`,
      issueUrl: record.issue
        ? `${input.articleUrlBase}/issues/${record.issue.id}`
        : null,
    });
    const source = elements.find((element) => element.name === "source")?.value ?? "";
    const hasIssnInSource = /ISSN\s+\S+/i.test(source);
    const hasJournalName = source.includes(input.journal.journalName);

    checks.push({
      id: `record_${record.submissionId}_dc_source`,
      label: `dc:source Garuda — ${record.submissionId}`,
      passed: hasIssnInSource && hasJournalName,
      detail: source || "dc:source kosong",
    });
  }

  return checks;
}

export function evaluateGarudaOaiVerbResponse(input: {
  verb: string;
  xml: string;
  status: number;
}): GarudaHarvestCheck {
  if (input.status >= 400) {
    return {
      id: `oai_${input.verb.toLowerCase()}`,
      label: `OAI verb ${input.verb}`,
      passed: false,
      detail: `HTTP ${input.status}`,
    };
  }

  const validator =
    input.verb === "ListRecords" || input.verb === "GetRecord"
      ? validateOaiDcRecordXml
      : validateOaiResponseXml;
  const result = validator(input.xml);

  return {
    id: `oai_${input.verb.toLowerCase()}`,
    label: `OAI verb ${input.verb}`,
    passed: result.ok,
    detail: result.ok ? undefined : result.reason,
  };
}

export function summarizeGarudaReadiness(
  checks: GarudaHarvestCheck[],
): { ready: boolean; passedCount: number; totalCount: number } {
  const passedCount = checks.filter((check) => check.passed).length;
  return {
    ready: passedCount === checks.length && checks.length > 0,
    passedCount,
    totalCount: checks.length,
  };
}
