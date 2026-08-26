import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for admin client");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for admin client");
}

/**
 * Supabase client with service_role privileges (bypasses RLS).
 * Server-only — never import in client components.
 */
export function createAdminClient() {
  const urlStr = url as string;
  const keyStr = serviceRoleKey as string;
  return createClient(urlStr, keyStr, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
