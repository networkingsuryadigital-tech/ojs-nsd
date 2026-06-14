import "server-only";

import {
  DOI_DEPOSIT_JOB_STATUSES,
  DOI_DEPOSIT_KINDS,
  DOI_STATUSES,
  CROSSREF_SCHEMA_VERSION,
  DOI_DEPOSIT_MAX_ATTEMPTS,
} from "@/domain/doi/types";
import { PUBLICATION_NOTICE_TYPES } from "@/domain/publication/notice";
import { DOI_DEPOSIT_BACKOFF_MS } from "@/domain/doi/retry";

export function getDoiHealth() {
  return {
    ok: true as const,
    crossrefSchemaVersion: CROSSREF_SCHEMA_VERSION,
    doiStatuses: [...DOI_STATUSES],
    depositJobStatuses: [...DOI_DEPOSIT_JOB_STATUSES],
    depositKinds: [...DOI_DEPOSIT_KINDS],
    publicationNoticeTypes: [...PUBLICATION_NOTICE_TYPES],
    maxAttempts: DOI_DEPOSIT_MAX_ATTEMPTS,
    retryBackoffMs: [...DOI_DEPOSIT_BACKOFF_MS],
    features: {
      crossRefDeposit: true,
      doiGenerationOnPublish: true,
      depositJobRetry: true,
      crossrefIdempotency: true,
      pollSubmittedDeposits: true,
      retractionWorkflow: true,
      correctionWorkflow: true,
      crossRefMetadataUpdate: true,
      editorialPublishedUi: true,
    },
  };
}
