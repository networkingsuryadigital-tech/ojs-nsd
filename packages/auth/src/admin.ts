import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "./types";

export function createAdminSupabaseClient(config: SupabaseConfig) {
  const key = config.serviceRoleKey;
  if (!key) {
    throw new Error("serviceRoleKey is required for admin Supabase operations");
  }
  return createClient(config.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
