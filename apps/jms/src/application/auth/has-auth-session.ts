import "server-only";

import { getServerSupabase } from "@/infrastructure/auth/supabase";

/** True when Supabase Auth has a session (e.g. after password-recovery callback). */
export async function hasAuthSession(): Promise<boolean> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
