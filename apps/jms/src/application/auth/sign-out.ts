import "server-only";

import { getServerSupabase } from "@/infrastructure/auth/supabase";

export async function signOut(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
}
