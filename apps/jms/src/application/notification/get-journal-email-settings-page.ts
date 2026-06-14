import "server-only";

import { z } from "zod";

import { getJournalEmailSettingsForAdmin } from "@/application/notification/update-journal-email-settings";
import { evaluateEmailDeliverabilityReadiness } from "@/domain/notification/email-from";
import { env } from "@/lib/env";

const getJournalEmailSettingsPageSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export async function getJournalEmailSettingsPage(
  input: z.infer<typeof getJournalEmailSettingsPageSchema>,
) {
  const parsed = getJournalEmailSettingsPageSchema.parse(input);
  const settings = await getJournalEmailSettingsForAdmin(parsed);
  const readiness = evaluateEmailDeliverabilityReadiness({
    settings,
    platformFallbackFrom: env.RESEND_FROM_EMAIL ?? null,
  });
  return { settings, readiness };
}
