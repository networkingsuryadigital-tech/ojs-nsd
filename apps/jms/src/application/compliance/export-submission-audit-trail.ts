import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import {
  serializeAuditTrailJson,
  type SubmissionAuditTrail,
} from "@/domain/compliance/audit-trail";
import { loadSubmissionAuditTrailRows } from "@/infrastructure/compliance/audit-trail-repository";

const exportSubmissionAuditTrailSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export async function exportSubmissionAuditTrail(
  input: z.infer<typeof exportSubmissionAuditTrailSchema>,
): Promise<SubmissionAuditTrail> {
  const parsed = exportSubmissionAuditTrailSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["EDITOR_IN_CHIEF", "SECTION_EDITOR", "JOURNAL_ADMIN"],
    "Only journal editors may export the audit trail.",
  );

  const rows = await loadSubmissionAuditTrailRows(
    parsed.journalId,
    parsed.submissionId,
  );

  return {
    exportedAt: new Date().toISOString(),
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    submissionStatus: rows.submissionStatus,
    reviewRound: rows.reviewRound,
    title: rows.title,
    events: rows.events,
  };
}

export async function downloadSubmissionAuditTrailJson(
  input: z.infer<typeof exportSubmissionAuditTrailSchema>,
): Promise<{ filename: string; body: string }> {
  const trail = await exportSubmissionAuditTrail(input);
  return {
    filename: `audit-trail-${trail.submissionId}.json`,
    body: serializeAuditTrailJson(trail),
  };
}
