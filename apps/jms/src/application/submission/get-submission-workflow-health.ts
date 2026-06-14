import "server-only";

import { TRANSITIONS } from "@/domain/submission/state-machine";
import { TRANSITION_NAMES } from "@/domain/submission/types";

export function getSubmissionWorkflowHealth() {
  return {
    ok: true as const,
    transitionCount: TRANSITION_NAMES.length,
    transitions: TRANSITION_NAMES.map((name) => {
      const transition = TRANSITIONS[name];
      return {
        name,
        from: [...transition.from],
        to: transition.to,
        changesStatus: transition.changesStatus,
        eventType: transition.eventType,
        allowedSubmissionRoles: transition.allowedSubmissionRoles
          ? [...transition.allowedSubmissionRoles]
          : [],
        allowedJournalRoles: transition.allowedJournalRoles
          ? [...transition.allowedJournalRoles]
          : [],
        allowSystem: transition.allowSystem ?? false,
      };
    }),
  };
}
