import "server-only";

import { Prisma } from "@prisma/client";

import { adminDb } from "@/infrastructure/db/admin-db";

export type ResolvedAppUser = {
  id: string;
  /** New provider-neutral identifier (Better Auth migration target). */
  authUserId?: string;
  /** @deprecated Transitional alias for legacy callers/tests. */
  supabaseId: string;
  email: string;
  name: string | null;
};

const userSelect = {
  id: true,
  supabaseId: true,
  email: true,
  name: true,
} as const;

function toResolved(user: {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
}): ResolvedAppUser {
  return {
    id: user.id,
    authUserId: user.supabaseId,
    supabaseId: user.supabaseId,
    email: user.email,
    name: user.name,
  };
}

/**
 * Transitional adapter: current source column is `supabaseId`.
 * Keep a provider-neutral API so Better Auth migration only touches this layer.
 */
export async function findUserByAuthUserId(
  authUserId: string,
): Promise<ResolvedAppUser | null> {
  const user = await adminDb.user.findUnique({
    where: { supabaseId: authUserId },
    select: userSelect,
  });
  return user ? toResolved(user) : null;
}

export async function findUserByEmail(
  email: string,
): Promise<ResolvedAppUser | null> {
  const user = await adminDb.user.findFirst({
    where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
    select: userSelect,
  });
  return user ? toResolved(user) : null;
}

export async function findAuthUserIdByEmail(
  email: string,
): Promise<string | null> {
  const row = await adminDb.authUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function linkAppUserToAuth(input: {
  userId: string;
  authUserId: string;
  name?: string | null;
}): Promise<ResolvedAppUser> {
  const user = await adminDb.user.update({
    where: { id: input.userId },
    data: {
      supabaseId: input.authUserId,
      ...(input.name ? { name: input.name } : {}),
    },
    select: userSelect,
  });
  return toResolved(user);
}

export async function createAppUserFromAuth(input: {
  authUserId: string;
  email: string;
  name?: string | null;
}): Promise<ResolvedAppUser> {
  try {
    const user = await adminDb.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name?.trim() || null,
        supabaseId: input.authUserId,
      },
      select: userSelect,
    });
    return toResolved(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing =
        (await findUserByAuthUserId(input.authUserId)) ??
        (await findUserByEmail(input.email));
      if (existing) {
        if (existing.supabaseId !== input.authUserId) {
          return linkAppUserToAuth({
            userId: existing.id,
            authUserId: input.authUserId,
            name: input.name ?? existing.name,
          });
        }
        return existing;
      }
    }
    throw error;
  }
}

/** Adds AUTHOR on first visit; does not strip existing editorial roles. */
export async function ensureAuthorMembership(
  journalId: string,
  userId: string,
): Promise<void> {
  await adminDb.journalMembership.upsert({
    where: {
      journalId_userId: { journalId, userId },
    },
    create: {
      journalId,
      userId,
      roles: ["AUTHOR"],
    },
    update: {
      isActive: true,
    },
  });
}
