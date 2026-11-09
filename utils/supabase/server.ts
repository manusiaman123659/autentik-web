import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { applyAuthCookiePolicy } from "@/lib/auth-cookie-policy";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  authResponseHeaders?: Headers,
) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, headers) {
          const changes = applyAuthCookiePolicy(cookiesToSet, cookieStore.getAll(), supabaseUrl!);
          let cookiesWritten = false;
          try {
            changes.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              cookiesWritten = true;
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
          // A partial cookie write still needs cache protection on the response.
          if (cookiesWritten && authResponseHeaders) {
            const sdkHeaders = new Headers(headers);
            for (const name of ["Cache-Control", "Expires", "Pragma"]) {
              const value = sdkHeaders.get(name);
              if (value !== null) authResponseHeaders.set(name, value);
            }
          }
        },
      },
    },
  );
};
