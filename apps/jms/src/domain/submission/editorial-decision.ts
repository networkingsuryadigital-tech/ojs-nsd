import type { EditorialDecisionType } from "./types";
import type { SubmissionStatus } from "./types";

export function decisionToStatus(
  decision: EditorialDecisionType,
): SubmissionStatus {
  switch (decision) {
    case "ACCEPT":
      return "ACCEPTED";
    case "REJECT":
      return "REJECTED";
    case "MINOR_REVISION":
    case "MAJOR_REVISION":
      return "REVISIONS_REQUESTED";
  }
}

export function isRevisionDecision(decision: EditorialDecisionType): boolean {
  return decision === "MINOR_REVISION" || decision === "MAJOR_REVISION";
}
