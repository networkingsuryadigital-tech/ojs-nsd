import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { findIssueInJournal, publishIssueRecord } from "@/infrastructure/publishing/issue-repository";

const publishIssueSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  issueId: z.string().trim().min(1),
});

export async function publishIssue(
  input: z.infer<typeof publishIssueSchema>,
): Promise<{ issueId: string; isPublished: true }> {
  const parsed = publishIssueSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    "Only journal admins or editors-in-chief may publish issues.",
  );

  const existing = await findIssueInJournal(parsed.journalId, parsed.issueId);
  if (!existing) {
    throw new Error("Issue not found.");
  }
  if (existing.isPublished) {
    throw new Error("Issue is already published.");
  }

  const issue = await publishIssueRecord(parsed.journalId, parsed.issueId);
  return { issueId: issue.id, isPublished: true };
}
