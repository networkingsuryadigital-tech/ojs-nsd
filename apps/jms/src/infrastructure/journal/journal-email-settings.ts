import "server-only";

import type { JournalEmailFromSettings } from "@/domain/notification/email-from";
import { withTenant } from "@/infrastructure/db/with-tenant";

export async function loadJournalEmailSettings(
  journalId: string,
): Promise<JournalEmailFromSettings> {
  return withTenant(journalId, async (tx) => {
    const theme = await tx.journalTheme.findUnique({
      where: { journalId },
      select: { emailFromName: true, emailFromAddress: true },
    });
    return {
      emailFromName: theme?.emailFromName ?? null,
      emailFromAddress: theme?.emailFromAddress ?? null,
    };
  });
}

export async function saveJournalEmailSettings(
  journalId: string,
  settings: JournalEmailFromSettings,
): Promise<JournalEmailFromSettings> {
  return withTenant(journalId, async (tx) => {
    await tx.journalTheme.upsert({
      where: { journalId },
      create: {
        journalId,
        emailFromName: settings.emailFromName,
        emailFromAddress: settings.emailFromAddress,
      },
      update: {
        emailFromName: settings.emailFromName,
        emailFromAddress: settings.emailFromAddress,
      },
    });
    return settings;
  });
}
