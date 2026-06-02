import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

/**
 * Creates a browser Supabase client for client components.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
