import "server-only";

import type {
  JournalMembershipExport,
  SubmissionParticipationExport,
  UserProfileExport,
} from "@/domain/privacy/user-data-export";

export async function loadUserProfileForExport(
  userId: string,
): Promise<UserProfileExport | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const user = await adminDb.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      affiliation: true,
      orcid: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    affiliation: user.affiliation,
    orcid: user.orcid,
    country: user.country,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function loadUserJournalMembershipsForExport(
  userId: string,
): Promise<JournalMembershipExport[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const memberships = await adminDb.journalMembership.findMany({
    where: { userId, isActive: true },
    select: {
      journalId: true,
      roles: true,
      isActive: true,
      createdAt: true,
      journal: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    journalId: membership.journalId,
    journalName: membership.journal.name,
    roles: membership.roles,
    isActive: membership.isActive,
    joinedAt: membership.createdAt.toISOString(),
  }));
}

export async function loadUserSubmissionParticipationsForExport(
  userId: string,
): Promise<SubmissionParticipationExport[]> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const participations = await adminDb.submissionParticipant.findMany({
    where: { userId },
    select: {
      role: true,
      createdAt: true,
      submission: {
        select: {
          id: true,
          journalId: true,
          status: true,
          translations: {
            where: { isPrimary: true },
            select: { title: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return participations.map((participation) => ({
    submissionId: participation.submission.id,
    journalId: participation.submission.journalId,
    role: participation.role,
    submissionStatus: participation.submission.status,
    title: participation.submission.translations[0]?.title ?? null,
    joinedAt: participation.createdAt.toISOString(),
  }));
}
