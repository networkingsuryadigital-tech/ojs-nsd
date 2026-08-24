import "server-only";

import { formatJournalEmailFrom, hostFromAbsoluteUrl } from "@/domain/notification/email-from";
import { adminDb } from "@/infrastructure/db/admin-db";
import { env } from "@/lib/env";
import { lookupJournalByHostFromDb } from "@/infrastructure/tenancy/journal-lookup";

/**
 * From-address for transactional mail (password reset, etc.).
 * Uses the journal's `JournalTheme.emailFrom*` when the page URL belongs
 * to a tenant host; otherwise the platform `RESEND_FROM_EMAIL`.
 */
export async function resolveTransactionalFromEmail(
  pageUrl: string,
): Promise<string | undefined> {
  const host = hostFromAbsoluteUrl(pageUrl);
  if (host) {
    const journal = await lookupJournalByHostFromDb(host);
    if (journal) {
      const theme = await adminDb.journalTheme.findUnique({
        where: { journalId: journal.id },
        select: { emailFromName: true, emailFromAddress: true },
      });
      const from = formatJournalEmailFrom(
        theme?.emailFromName ?? null,
        theme?.emailFromAddress ?? null,
      );
      if (from) {
        return from;
      }
    }
  }

  return env.RESEND_FROM_EMAIL;
}
