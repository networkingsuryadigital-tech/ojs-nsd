import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { EDITORIAL_DECISION_TYPES } from "@/domain/submission/types";
import { transitionSubmission } from "@/application/submission/transition-submission";

const recordEditorDecisionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  decision: z.enum(EDITORIAL_DECISION_TYPES),
  note: z.string().max(5000).optional(),
});

async function assertHandlingEditor(
  journalId: string,
  submissionId: string,
  actorId: string,
): Promise<void> {
  const [submissionRoles, journalRoles] = await Promise.all([
    resolveSubmissionRoles(journalId, submissionId, actorId),
    resolveJournalRoles(journalId, actorId),
  ]);

  const permitted =
    submissionRoles.includes("HANDLING_EDITOR") ||
    journalRoles.includes("EDITOR_IN_CHIEF") ||
    journalRoles.includes("SECTION_EDITOR");

  if (!permitted) {
    throw new SubmissionAuthorizationError(
      "Only handling editors may record editorial decisions.",
    );
  }
}

export async function recordEditorDecision(
  input: z.infer<typeof recordEditorDecisionSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = recordEditorDecisionSchema.parse(input);
  await assertHandlingEditor(
    parsed.journalId,
    parsed.submissionId,
    parsed.actorId,
  );

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "recordDecision",
    payload: {
      decision: parsed.decision,
      note: parsed.note,
    },
  });
}
