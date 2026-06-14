import "server-only";

import { GALLEY_LABELS } from "@/domain/publishing/types";
import { TRANSITION_NAMES } from "@/domain/submission/types";

export function getPublishingHealth() {
  return {
    ok: true as const,
    galleyLabels: [...GALLEY_LABELS],
    publishingTransitions: TRANSITION_NAMES.filter((name) =>
      ["uploadGalley", "publishToIssue"].includes(name),
    ),
    features: {
      issueManagement: true,
      galleyUpload: true,
      publishSubmission: true,
      publishIssue: true,
      publicArchive: true,
    },
  };
}
