import "server-only";

import { parseEmbeddingVector } from "@/domain/reviewer-matching/embedding";

export type ReviewerProfileRecord = {
  userId: string;
  keywords: string[];
  maxLoad: number;
  embedding: number[] | null;
  embeddingModel: string | null;
  embeddingSourceHash: string | null;
};

function mapProfile(row: {
  userId: string;
  keywords: string[];
  maxLoad: number;
  embedding: unknown;
  embeddingModel: string | null;
  embeddingSourceHash: string | null;
}): ReviewerProfileRecord {
  return {
    userId: row.userId,
    keywords: row.keywords,
    maxLoad: row.maxLoad,
    embedding: parseEmbeddingVector(row.embedding),
    embeddingModel: row.embeddingModel,
    embeddingSourceHash: row.embeddingSourceHash,
  };
}

const profileSelect = {
  userId: true,
  keywords: true,
  maxLoad: true,
  embedding: true,
  embeddingModel: true,
  embeddingSourceHash: true,
} as const;

export async function findReviewerProfileByUserId(
  userId: string,
): Promise<ReviewerProfileRecord | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const profile = await adminDb.reviewerProfile.findUnique({
    where: { userId },
    select: profileSelect,
  });

  return profile ? mapProfile(profile) : null;
}

export async function upsertReviewerProfileRecord(input: {
  userId: string;
  keywords: string[];
  maxLoad: number;
}): Promise<ReviewerProfileRecord> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const profile = await adminDb.reviewerProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      keywords: input.keywords,
      maxLoad: input.maxLoad,
    },
    update: {
      keywords: input.keywords,
      maxLoad: input.maxLoad,
    },
    select: profileSelect,
  });

  return mapProfile(profile);
}

export async function saveReviewerProfileEmbedding(
  userId: string,
  input: {
    embedding: number[];
    embeddingModel: string;
    embeddingSourceHash: string;
  },
): Promise<void> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  await adminDb.reviewerProfile.update({
    where: { userId },
    data: {
      embedding: input.embedding,
      embeddingModel: input.embeddingModel,
      embeddingSourceHash: input.embeddingSourceHash,
    },
  });
}

export async function listReviewerProfilesForActiveJournalReviewers(): Promise<
  ReviewerProfileRecord[]
> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");

  const activeJournals = await adminDb.journal.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeJournals.length === 0) {
    return [];
  }

  const memberships = await adminDb.journalMembership.findMany({
    where: {
      journalId: { in: activeJournals.map((journal) => journal.id) },
      isActive: true,
      roles: { has: "REVIEWER" },
    },
    select: { userId: true },
  });

  const reviewerUserIds = [...new Set(memberships.map((membership) => membership.userId))];
  if (reviewerUserIds.length === 0) {
    return [];
  }

  const profiles = await adminDb.reviewerProfile.findMany({
    where: { userId: { in: reviewerUserIds } },
    select: profileSelect,
  });

  return profiles.map(mapProfile);
}
