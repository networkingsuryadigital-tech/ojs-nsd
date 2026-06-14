import "server-only";

import { z } from "zod";

import { assertJournalRoles } from "@/application/identity/assert-journal-roles";
import { resolveJournalRoles } from "@/application/identity/resolve-journal-roles";
import { normalizeKeyword } from "@/domain/reviewer-matching/keywords";
import { SubmissionAuthorizationError } from "@/domain/submission/errors";
import { findReviewerInJournal } from "@/infrastructure/review/review-repository";
import { refreshReviewerEmbedding } from "@/application/reviewer-matching/refresh-reviewer-embedding";
import {
  findReviewerProfileByUserId,
  upsertReviewerProfileRecord,
  type ReviewerProfileRecord,
} from "@/infrastructure/ai/reviewer-profile-repository";

const upsertReviewerProfileSchema = z.object({
  journalId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  targetUserId: z.string().trim().min(1).optional(),
  keywords: z.array(z.string()).max(50),
  maxLoad: z.number().int().min(1).max(20),
});

export type UpsertReviewerProfileResult = {
  profile: ReviewerProfileRecord;
  embeddingRefresh: Awaited<ReturnType<typeof refreshReviewerEmbedding>>;
};

function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const keyword of keywords) {
    const value = normalizeKeyword(keyword);
    if (value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export async function upsertReviewerProfile(
  input: z.infer<typeof upsertReviewerProfileSchema>,
): Promise<UpsertReviewerProfileResult> {
  const parsed = upsertReviewerProfileSchema.parse(input);
  const targetUserId = parsed.targetUserId ?? parsed.actorId;
  const keywords = normalizeKeywords(parsed.keywords);

  if (targetUserId === parsed.actorId) {
    const roles = await resolveJournalRoles(parsed.journalId, parsed.actorId);
    if (!roles.includes("REVIEWER") && !roles.includes("JOURNAL_ADMIN")) {
      throw new SubmissionAuthorizationError();
    }
  } else {
    await assertJournalRoles(
      parsed.journalId,
      parsed.actorId,
      ["JOURNAL_ADMIN"],
      "Only journal admins can edit another reviewer's profile.",
    );
  }

  const reviewer = await findReviewerInJournal(parsed.journalId, targetUserId);
  if (!reviewer) {
    throw new Error("Reviewer not found in this journal.");
  }

  const profile = await upsertReviewerProfileRecord({
    userId: targetUserId,
    keywords,
    maxLoad: parsed.maxLoad,
  });

  const embeddingRefresh = await refreshReviewerEmbedding({
    userId: targetUserId,
    keywords,
  });

  return { profile, embeddingRefresh };
}

export async function getReviewerProfileForJournal(input: {
  journalId: string;
  actorId: string;
  targetUserId?: string;
}): Promise<ReviewerProfileRecord | null> {
  const targetUserId = input.targetUserId ?? input.actorId;

  if (targetUserId === input.actorId) {
    const roles = await resolveJournalRoles(input.journalId, input.actorId);
    if (!roles.includes("REVIEWER") && !roles.includes("JOURNAL_ADMIN")) {
      throw new SubmissionAuthorizationError();
    }
  } else {
    await assertJournalRoles(
      input.journalId,
      input.actorId,
      ["JOURNAL_ADMIN"],
      "Only journal admins can view another reviewer's profile.",
    );
  }

  const reviewer = await findReviewerInJournal(input.journalId, targetUserId);
  if (!reviewer) {
    throw new Error("Reviewer not found in this journal.");
  }

  return findReviewerProfileByUserId(targetUserId);
}
