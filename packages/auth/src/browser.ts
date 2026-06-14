import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseConfig } from "./types";

export function createBrowserSupabaseClient(config: SupabaseConfig) {
  return createBrowserClient(config.url, config.anonKey);
}
