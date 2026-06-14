import "server-only";

import { createAdminSupabaseClient } from "@nsd/auth/admin";
import { createServerSupabaseClient } from "@nsd/auth/server";
import { getSupabaseConfig } from "@/lib/supabase-config";

export async function getServerSupabase() {
  return createServerSupabaseClient(getSupabaseConfig());
}

export function getAdminSupabase() {
  return createAdminSupabaseClient(getSupabaseConfig());
}
