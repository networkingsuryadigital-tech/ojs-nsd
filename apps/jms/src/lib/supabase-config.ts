import type { SupabaseConfig } from "@nsd/auth";
import { env } from "./env";

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
