import "server-only";

import { anonymizedUserEmail } from "@/domain/privacy/anonymization";

export type UserDeletionRecord = {
  id: string;
  supabaseId: string;
  email: string;
};

export async function loadUserForDeletion(
  userId: string,
): Promise<UserDeletionRecord | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  return adminDb.user.findUnique({
    where: { id: userId },
    select: { id: true, supabaseId: true, email: true },
  });
}

export async function anonymizeUserRecord(userId: string): Promise<void> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const redactedEmail = anonymizedUserEmail(userId);

  await adminDb.$transaction([
    adminDb.user.update({
      where: { id: userId },
      data: {
        email: redactedEmail,
        name: null,
        affiliation: null,
        orcid: null,
        country: null,
        avatarUrl: null,
      },
    }),
    adminDb.journalMembership.updateMany({
      where: { userId },
      data: { isActive: false },
    }),
    adminDb.reviewerProfile.deleteMany({ where: { userId } }),
    adminDb.notification.deleteMany({ where: { userId } }),
  ]);
}
