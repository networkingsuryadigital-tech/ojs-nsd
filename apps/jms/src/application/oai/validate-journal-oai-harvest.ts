import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { handleOaiRequest } from "@/application/oai/handle-oai-request";
import {
  evaluateGarudaJournalConfig,
  evaluateGarudaOaiVerbResponse,
  evaluateGarudaPublishedInventory,
  evaluateGarudaRecordSamples,
  summarizeGarudaReadiness,
  type GarudaHarvestCheck,
} from "@/domain/oai/garuda-harvest-readiness";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import {
  fetchOaiJournalContext,
  listOaiPublishedRecords,
} from "@/infrastructure/oai/oai-repository";
import { withTenant } from "@/infrastructure/db/with-tenant";

const validateJournalOaiHarvestSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  baseSiteUrl: z.string().url(),
  repositoryHost: z.string().trim().min(1),
});

export type ValidateJournalOaiHarvestResult = {
  ready: boolean;
  passedCount: number;
  totalCount: number;
  checks: GarudaHarvestCheck[];
  validatedAt: string;
};

export async function validateJournalOaiHarvest(
  input: z.infer<typeof validateJournalOaiHarvestSchema>,
): Promise<ValidateJournalOaiHarvestResult> {
  const parsed = validateJournalOaiHarvestSchema.parse(input);
  const roles = await resolveJournalRoles(parsed.journalId, parsed.actorId);
  const allowed =
    roles.includes("JOURNAL_ADMIN") || roles.includes("EDITOR_IN_CHIEF");
  if (!allowed) {
    throw new SubmissionAuthorizationError();
  }

  const journal = await fetchOaiJournalContext(parsed.journalId);
  if (!journal) {
    throw new Error("Journal not found.");
  }

  const publishedRecordCount = await withTenant(parsed.journalId, (tx) =>
    tx.submission.count({
      where: {
        journalId: parsed.journalId,
        status: { in: ["PUBLISHED", "RETRACTED"] },
      },
    }),
  );

  const checks: GarudaHarvestCheck[] = [
    ...evaluateGarudaJournalConfig(journal),
    evaluateGarudaPublishedInventory(publishedRecordCount),
  ];

  const baseUrl = `${parsed.baseSiteUrl.replace(/\/$/, "")}/api/oai`;
  const verbs = ["Identify", "ListMetadataFormats", "ListRecords"] as const;

  for (const verb of verbs) {
    const params = new URLSearchParams({ verb });
    if (verb === "ListRecords") {
      params.set("metadataPrefix", "oai_dc");
    }

    const response = await handleOaiRequest({
      journalId: parsed.journalId,
      baseUrl,
      baseSiteUrl: parsed.baseSiteUrl,
      repositoryHost: parsed.repositoryHost,
      searchParams: params,
    });

    checks.push(
      evaluateGarudaOaiVerbResponse({
        verb,
        xml: response.xml,
        status: response.status,
      }),
    );
  }

  const sampleRecords = await listOaiPublishedRecords(
    parsed.journalId,
    {},
    { limit: 3 },
  );
  checks.push(
    ...evaluateGarudaRecordSamples({
      records: sampleRecords.records,
      journal,
      articleUrlBase: parsed.baseSiteUrl.replace(/\/$/, ""),
    }),
  );

  const summary = summarizeGarudaReadiness(checks);

  return {
    ...summary,
    checks,
    validatedAt: new Date().toISOString(),
  };
}
