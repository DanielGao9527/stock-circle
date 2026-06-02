import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function getDefaultDisplayName(user: User) {
  const emailName = user.email?.split("@")[0]?.trim();
  return emailName || `成员 ${user.id.slice(0, 8)}`;
}

/**
 * Ensures the current authenticated user has a lightweight profile row.
 */
export async function ensureProfile(supabase: SupabaseServerClient, user: User) {
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: getDefaultDisplayName(user),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    },
  );
}
