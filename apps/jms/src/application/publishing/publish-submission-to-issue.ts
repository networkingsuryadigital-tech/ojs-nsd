import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { transitionSubmission } from "@/application/submission/transition-submission";
import { findIssueInJournal } from "@/infrastructure/publishing/issue-repository";
import { loadSubmission } from "@/infrastructure/submission/submission-repository";

const publishSubmissionToIssueSchema = z.object({
  journalId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  issueId: z.string().trim().min(1),
});

export async function publishSubmissionToIssue(
  input: z.infer<typeof publishSubmissionToIssueSchema>,
): Promise<{ fromStatus: string; toStatus: string; eventType: string }> {
  const parsed = publishSubmissionToIssueSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    "Only journal admins or editors-in-chief may publish submissions.",
  );

  const submission = await loadSubmission(parsed.journalId, parsed.submissionId);
  if (!submission) {
    throw new Error("Submission not found.");
  }
  if (submission.status !== "IN_PRODUCTION") {
    throw new Error("Only in-production submissions may be published.");
  }

  const issue = await findIssueInJournal(parsed.journalId, parsed.issueId);
  if (!issue) {
    throw new Error("Issue not found.");
  }

  return transitionSubmission({
    journalId: parsed.journalId,
    submissionId: parsed.submissionId,
    actorId: parsed.actorId,
    name: "publishToIssue",
    payload: { issueId: parsed.issueId },
  });
}
