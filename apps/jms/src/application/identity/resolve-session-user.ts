import "server-only";

import { getServerSupabase } from "@/infrastructure/auth/supabase";
import {
  findUserBySupabaseId,
  type ResolvedAppUser,
} from "@/infrastructure/identity/user-repository";

export async function resolveSessionUser(): Promise<ResolvedAppUser | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return findUserBySupabaseId(user.id);
}
