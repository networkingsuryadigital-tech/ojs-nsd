import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import { parseRejectedSubmissionRetentionDays } from "@/domain/privacy/retention";
import {
  loadJournalRetentionDays,
  saveJournalRetentionDays,
} from "@/infrastructure/privacy/retention-repository";

const updateJournalRetentionSettingsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  retentionDays: z.string(),
});

export async function updateJournalRetentionSettings(
  input: z.infer<typeof updateJournalRetentionSettingsSchema>,
): Promise<{ retentionDays: number | null }> {
  const parsed = updateJournalRetentionSettingsSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const retentionDays = parseRejectedSubmissionRetentionDays(
    parsed.retentionDays,
  );
  await saveJournalRetentionDays(parsed.journalId, retentionDays);
  return { retentionDays };
}

export async function getJournalRetentionSettings(input: {
  journalId: string;
  actorId: string;
}): Promise<{ retentionDays: number | null }> {
  await assertJournalAdmin(input.journalId, input.actorId);
  const retentionDays = await loadJournalRetentionDays(input.journalId);
  return { retentionDays };
}
