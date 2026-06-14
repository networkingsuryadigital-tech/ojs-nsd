import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { formatIssueCitation } from "@/domain/publishing/issue";
import {
  listIssuesInJournal,
  type IssueRecord,
} from "@/infrastructure/publishing/issue-repository";

const listIssuesSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
});

export type IssueListItem = IssueRecord & { citation: string };

export async function listIssues(
  input: z.infer<typeof listIssuesSchema>,
): Promise<IssueListItem[]> {
  const parsed = listIssuesSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF", "SECTION_EDITOR"],
    "Only editorial staff may list issues.",
  );

  const issues = await listIssuesInJournal(parsed.journalId);
  return issues.map((issue) => ({
    ...issue,
    citation: formatIssueCitation(issue),
  }));
}
