import "server-only";

import { OAI_DC_METADATA_PREFIX, OAI_VERBS } from "@/domain/oai/types";

export function getOaiHealth() {
  return {
    ok: true as const,
    protocolVersion: "2.0",
    metadataPrefix: OAI_DC_METADATA_PREFIX,
    verbs: [...OAI_VERBS],
    features: {
      dublinCore: true,
      listSetsByIssue: true,
      resumptionTokens: true,
      listRecordsCache: true,
      rateLimiting: true,
      harvestValidation: true,
      garudaReadinessValidation: true,
      editorialOaiValidationUi: true,
    },
  };
}
