import "server-only";

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

/**
 * Transitional adapter: current source column is `supabaseId`.
 * Keep a provider-neutral API so Better Auth migration only touches this layer.
 */
export async function findUserByAuthUserId(
  authUserId: string,
): Promise<ResolvedAppUser | null> {
  const user = await adminDb.user.findUnique({
    where: { supabaseId: authUserId },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      name: true,
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    authUserId: user.supabaseId,
    supabaseId: user.supabaseId,
    email: user.email,
    name: user.name,
  };
}
