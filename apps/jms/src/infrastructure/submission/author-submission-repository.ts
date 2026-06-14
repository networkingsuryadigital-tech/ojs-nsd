import "server-only";

import type { SubmissionStatus } from "@/domain/submission/types";
import { withTenant } from "@/infrastructure/db/with-tenant";

export type AuthorSubmissionRow = {
  id: string;
  status: SubmissionStatus;
  title: string | null;
  updatedAt: Date;
  hasManuscript: boolean;
};

export async function listAuthorSubmissionsFromDb(
  journalId: string,
  actorUserId: string,
): Promise<AuthorSubmissionRow[]> {
  const participants = await withTenant(journalId, (tx) =>
    tx.submissionParticipant.findMany({
      where: {
        userId: actorUserId,
        role: { in: ["AUTHOR", "CORRESPONDING_AUTHOR"] },
        submission: { journalId },
      },
      select: {
        submission: {
          select: {
            id: true,
            status: true,
            updatedAt: true,
            translations: {
              where: { isPrimary: true },
              select: { title: true },
              take: 1,
            },
            files: {
              where: { type: "MANUSCRIPT", round: 0 },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { submission: { updatedAt: "desc" } },
    }),
  );

  return participants.map((participant) => ({
    id: participant.submission.id,
    status: participant.submission.status,
    title: participant.submission.translations[0]?.title ?? null,
    updatedAt: participant.submission.updatedAt,
    hasManuscript: participant.submission.files.length > 0,
  }));
}

export type AuthorSubmissionDetailRow = {
  id: string;
  status: SubmissionStatus;
  reviewRound: number;
  title: string | null;
  abstract: string | null;
  keywords: string[];
  manuscriptFile: {
    id: string;
    originalName: string;
    createdAt: Date;
  } | null;
};

export async function getAuthorSubmissionDetailFromDb(
  journalId: string,
  submissionId: string,
  actorUserId: string,
): Promise<AuthorSubmissionDetailRow | null> {
  return withTenant(journalId, async (tx) => {
    const participant = await tx.submissionParticipant.findFirst({
      where: {
        submissionId,
        userId: actorUserId,
        role: { in: ["AUTHOR", "CORRESPONDING_AUTHOR"] },
        submission: { journalId },
      },
      select: {
        submission: {
          select: {
            id: true,
            status: true,
            reviewRound: true,
            translations: {
              where: { isPrimary: true },
              select: { title: true, abstract: true, keywords: true },
              take: 1,
            },
            files: {
              where: { type: "MANUSCRIPT", round: 0 },
              select: { id: true, originalName: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!participant) {
      return null;
    }

    const translation = participant.submission.translations[0];
    const manuscript = participant.submission.files[0];

    return {
      id: participant.submission.id,
      status: participant.submission.status,
      reviewRound: participant.submission.reviewRound,
      title: translation?.title ?? null,
      abstract: translation?.abstract ?? null,
      keywords: translation?.keywords ?? [],
      manuscriptFile: manuscript
        ? {
            id: manuscript.id,
            originalName: manuscript.originalName,
            createdAt: manuscript.createdAt,
          }
        : null,
    };
  });
}

export async function listJournalSectionsFromDb(
  journalId: string,
): Promise<Array<{ id: string; title: string }>> {
  return withTenant(journalId, (tx) =>
    tx.section.findMany({
      where: { journalId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  );
}
