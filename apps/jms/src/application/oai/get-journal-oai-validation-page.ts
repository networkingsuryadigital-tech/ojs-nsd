import "server-only";

import { z } from "zod";

import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { resolveOaiSiteContext } from "@/application/oai/resolve-oai-site-context";
import { validateJournalOaiHarvest } from "@/application/oai/validate-journal-oai-harvest";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";

const getJournalOaiValidationPageSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  baseSiteUrl: z.string().url(),
  repositoryHost: z.string().trim().min(1).optional(),
  requestHost: z.string().trim().min(1).optional(),
});

export async function getJournalOaiValidationPage(
  input: z.infer<typeof getJournalOaiValidationPageSchema>,
) {
  const parsed = getJournalOaiValidationPageSchema.parse(input);
  const roles = await resolveJournalRoles(parsed.journalId, parsed.actorId);
  const allowed =
    roles.includes("JOURNAL_ADMIN") || roles.includes("EDITOR_IN_CHIEF");
  if (!allowed) {
    throw new SubmissionAuthorizationError();
  }

  const repositoryHost =
    parsed.repositoryHost ??
    (parsed.requestHost
      ? resolveOaiSiteContext({
          requestHost: parsed.requestHost,
          requestProtocol: new URL(parsed.baseSiteUrl).protocol.replace(":", ""),
        }).repositoryHost
      : undefined);

  if (!repositoryHost) {
    throw new Error("repositoryHost is required.");
  }

  return validateJournalOaiHarvest({
    journalId: parsed.journalId,
    actorId: parsed.actorId,
    baseSiteUrl: parsed.baseSiteUrl,
    repositoryHost,
  });
}
