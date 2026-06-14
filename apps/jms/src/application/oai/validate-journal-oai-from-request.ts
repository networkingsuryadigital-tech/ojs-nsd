import "server-only";

import { getJournalOaiValidationPage } from "@/application/oai/get-journal-oai-validation-page";
import { resolveOaiSiteContextFromRequest } from "@/application/oai/resolve-oai-site-context";

export async function validateJournalOaiFromRequest(input: {
  journalId: string;
  actorId: string;
  request: Request;
}) {
  const { baseSiteUrl, repositoryHost } = resolveOaiSiteContextFromRequest(
    input.request,
  );
  return getJournalOaiValidationPage({
    journalId: input.journalId,
    actorId: input.actorId,
    baseSiteUrl,
    repositoryHost,
  });
}
