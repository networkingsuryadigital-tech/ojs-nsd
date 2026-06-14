import "server-only";

import { z } from "zod";

import { assertJournalAdmin } from "@/application/billing/assert-journal-admin";
import {
  parseJournalEmailFromAddressInput,
  parseJournalEmailFromNameInput,
} from "@/domain/notification/email-from";
import {
  loadJournalEmailSettings,
  saveJournalEmailSettings,
} from "@/infrastructure/journal/journal-email-settings";

const updateJournalEmailSettingsSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  emailFromName: z.string(),
  emailFromAddress: z.string(),
});

export async function updateJournalEmailSettings(
  input: z.infer<typeof updateJournalEmailSettingsSchema>,
) {
  const parsed = updateJournalEmailSettingsSchema.parse(input);
  await assertJournalAdmin(parsed.journalId, parsed.actorId);

  const emailFromName = parseJournalEmailFromNameInput(parsed.emailFromName);
  const emailFromAddress = parseJournalEmailFromAddressInput(
    parsed.emailFromAddress,
  );

  return saveJournalEmailSettings(parsed.journalId, {
    emailFromName,
    emailFromAddress,
  });
}

export async function getJournalEmailSettingsForAdmin(input: {
  journalId: string;
  actorId: string;
}) {
  await assertJournalAdmin(input.journalId, input.actorId);
  return loadJournalEmailSettings(input.journalId);
}
