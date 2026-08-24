import "server-only";

import {
  createAppUserFromAuth,
  ensureAuthorMembership,
  findUserByAuthUserId,
  findUserByEmail,
  linkAppUserToAuth,
  type ResolvedAppUser,
} from "@/infrastructure/identity/user-repository";

/**
 * Ensures a Prisma `User` exists for a Better Auth identity, then (optionally)
 * upserts AUTHOR membership on the current journal.
 *
 * Registration can create Auth before the session cookie is visible in the
 * same Server Action. Login must still be able to attach the JMS profile.
 */
export async function ensureJmsUserFromAuth(input: {
  authUserId: string;
  email: string;
  name?: string | null;
  journalId: string | null;
}): Promise<ResolvedAppUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;

  let user = await findUserByAuthUserId(input.authUserId);
  if (!user) {
    const byEmail = await findUserByEmail(email);
    if (byEmail) {
      user = await linkAppUserToAuth({
        userId: byEmail.id,
        authUserId: input.authUserId,
        name: name ?? byEmail.name,
      });
    } else {
      user = await createAppUserFromAuth({
        authUserId: input.authUserId,
        email,
        name,
      });
    }
  }

  if (input.journalId) {
    await ensureAuthorMembership(input.journalId, user.id);
  }

  return user;
}
