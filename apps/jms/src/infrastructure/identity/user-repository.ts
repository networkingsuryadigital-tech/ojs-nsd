import "server-only";

import { adminDb } from "@/infrastructure/db/admin-db";

export type ResolvedAppUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
};

export async function findUserBySupabaseId(
  supabaseId: string,
): Promise<ResolvedAppUser | null> {
  const user = await adminDb.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      name: true,
    },
  });
  return user;
}
