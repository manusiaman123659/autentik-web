import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { applyAuthCookiePolicy } from "@/lib/auth-cookie-policy";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          const changes = applyAuthCookiePolicy(cookiesToSet, request.cookies.getAll(), supabaseUrl!)
          changes.forEach(({ name, value }) => request.cookies.set(name, value))
          const previousResponse = supabaseResponse
          supabaseResponse = NextResponse.next({
            request,
          })
          // SDK callbacks may update disjoint cookies during one refresh.
          for (const cookie of previousResponse.cookies.getAll()) supabaseResponse.cookies.set(cookie)
          changes.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          const authHeaders = new Headers(headers)
          for (const name of ["Cache-Control", "Expires", "Pragma"]) {
            const value = authHeaders.get(name) ?? previousResponse.headers.get(name)
            if (value !== null) supabaseResponse.headers.set(name, value)
          }
        },
      },
    },
  );

  // setAll can replace the response while getUser refreshes the session.
  return { supabase, get supabaseResponse() { return supabaseResponse } }
};
