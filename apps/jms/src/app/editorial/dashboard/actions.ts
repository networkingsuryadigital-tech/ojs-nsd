"use server";

import {
  getReviewerProfileForJournal,
  upsertReviewerProfile,
} from "@/application/reviewer-matching/upsert-reviewer-profile";
import { requireAuthenticatedUserId } from "@/application/identity/require-authenticated-user";
import { resolveRequestJournalId } from "@/application/tenancy/resolve-request-journal-id";

export async function upsertReviewerProfileAction(input: {
  actorId: string;
  keywords: string[];
  maxLoad: number;
  targetUserId?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return upsertReviewerProfile({
    journalId,
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    keywords: input.keywords,
    maxLoad: input.maxLoad,
  });
}

export async function getReviewerProfileAction(input: {
  actorId: string;
  targetUserId?: string;
}) {
  const journalId = await resolveRequestJournalId();

  return getReviewerProfileForJournal({
    journalId,
    actorId: input.actorId,
    targetUserId: input.targetUserId,
  });
}

export async function upsertReviewerProfileFormAction(formData: FormData) {
  const actorId = await requireAuthenticatedUserId();
  const keywordsRaw = String(formData.get("keywords") ?? "");
  const maxLoad = Number(formData.get("maxLoad") ?? "3");

  const keywords = keywordsRaw
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  await upsertReviewerProfileAction({
    actorId,
    keywords,
    maxLoad,
  });
}
