import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service_role privileges — bypasses RLS.
 * Use ONLY in server-side code that must write without session context
 * (e.g. webhook handlers, cron jobs). Never expose to client bundles.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak terdefinisi di .env.local"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
