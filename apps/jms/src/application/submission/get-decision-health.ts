import "server-only";

import { EDITORIAL_DECISION_TYPES } from "@/domain/submission/types";
import { isRevisionDecision } from "@/domain/submission/editorial-decision";

export function getDecisionHealth() {
  return {
    ok: true as const,
    editorialDecisionTypes: [...EDITORIAL_DECISION_TYPES],
    revisionDecisions: EDITORIAL_DECISION_TYPES.filter(isRevisionDecision),
    features: {
      recordEditorDecision: true,
      revisionUpload: true,
      authorResubmit: true,
      multiRoundReview: true,
    },
  };
}
