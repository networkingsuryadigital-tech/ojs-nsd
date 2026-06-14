"use server";

import { createIssue } from "@/application/publishing/create-issue";
import { publishIssue } from "@/application/publishing/publish-issue";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function createIssueAction(input: {
  actorId: string;
  volume: number;
  number: number;
  year: number;
  title?: string;
}) {
  const journalId = await resolveRequestJournalId();
  return createIssue({ journalId, ...input });
}

export async function publishIssueAction(input: {
  actorId: string;
  issueId: string;
}) {
  const journalId = await resolveRequestJournalId();
  return publishIssue({ journalId, ...input });
}

export async function createIssueFormAction(formData: FormData) {
  const actorId = await requireAuthenticatedUserId();
  const volume = Number(formData.get("volume"));
  const number = Number(formData.get("number"));
  const year = Number(formData.get("year"));
  const title = String(formData.get("title") ?? "").trim() || undefined;

  await createIssueAction({ actorId, volume, number, year, title });
}

export async function publishIssueFormAction(formData: FormData) {
  const actorId = await requireAuthenticatedUserId();
  const issueId = String(formData.get("issueId") ?? "");
  await publishIssueAction({ actorId, issueId });
}
