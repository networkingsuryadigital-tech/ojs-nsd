import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { validateIssueIdentity } from "@/domain/publishing/issue";
import { createIssueRecord } from "@/infrastructure/publishing/issue-repository";

const createIssueSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  volume: z.number().int().positive(),
  number: z.number().int().positive(),
  year: z.number().int(),
  title: z.string().trim().max(500).optional(),
});

export async function createIssue(
  input: z.infer<typeof createIssueSchema>,
): Promise<{ issueId: string }> {
  const parsed = createIssueSchema.parse(input);

  await assertJournalRoles(
    parsed.journalId,
    parsed.actorId,
    ["JOURNAL_ADMIN", "EDITOR_IN_CHIEF"],
    "Only journal admins or editors-in-chief may create issues.",
  );

  const validation = validateIssueIdentity({
    volume: parsed.volume,
    number: parsed.number,
    year: parsed.year,
    title: parsed.title,
  });
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const issue = await createIssueRecord(parsed.journalId, {
    volume: parsed.volume,
    number: parsed.number,
    year: parsed.year,
    title: parsed.title,
  });

  return { issueId: issue.id };
}
