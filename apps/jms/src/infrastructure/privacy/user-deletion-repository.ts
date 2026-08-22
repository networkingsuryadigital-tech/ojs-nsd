import "server-only";

import { anonymizedUserEmail } from "@/domain/privacy/anonymization";

export type UserDeletionRecord = {
  id: string;
  /** New provider-neutral identifier (Better Auth migration target). */
  authUserId?: string;
  /** @deprecated Transitional alias for legacy callers/tests. */
  supabaseId: string;
  email: string;
};

export async function loadUserForDeletion(
  userId: string,
): Promise<UserDeletionRecord | null> {
  const { adminDb } = await import("@/infrastructure/db/admin-db");
  const user = await adminDb.user.findUnique({
    where: { id: userId },
    select: { id: true, supabaseId: true, email: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    authUserId: user.supabaseId,
    supabaseId: user.supabaseId,
    email: user.email,
  };
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
