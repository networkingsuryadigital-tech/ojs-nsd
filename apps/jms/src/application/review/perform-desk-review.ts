import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveSubmissionRoles } from "@/application/identity/resolve-submission-roles";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { transitionSubmission } from "@/application/submission/transition-submission";

const deskActionSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  note: z.string().max(5000).optional(),
});

async function assertDeskReviewer(
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
      "Only editors may perform desk review actions.",
    );
  }
}

export async function assignSubmissionToEditor(
  input: z.infer<typeof deskActionSchema> & { handlingEditorId?: string },
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = deskActionSchema.parse(input);
  await assertDeskReviewer(parsed.journalId, parsed.submissionId, parsed.actorId);

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "assignToEditor",
    payload: {
      handlingEditorId: input.handlingEditorId,
      note: parsed.note,
    },
  });
}

export async function deskRejectSubmission(
  input: z.infer<typeof deskActionSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = deskActionSchema.parse(input);
  await assertDeskReviewer(parsed.journalId, parsed.submissionId, parsed.actorId);

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "deskReject",
    payload: { note: parsed.note },
  });
}

const sendToReviewSchema = deskActionSchema.extend({
  acknowledgeHighSimilarity: z.boolean().optional(),
});

export async function sendSubmissionToReview(
  input: z.infer<typeof sendToReviewSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = sendToReviewSchema.parse(input);
  await assertDeskReviewer(parsed.journalId, parsed.submissionId, parsed.actorId);

  const { assertSimilarityGateAllowed } = await import(
    "@/application/similarity/assert-similarity-gate"
  );
  await assertSimilarityGateAllowed({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    acknowledgeHighSimilarity: parsed.acknowledgeHighSimilarity,
  });

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "sendToReview",
    payload: { note: parsed.note },
  });
}
