import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // Refresh the auth session (if expired) and propagate the new cookies.
  // Do not run code between createServerClient and auth.getUser().
  try {
    await supabase.auth.getUser();
  } catch (error) {
    const isRefreshTokenError =
      error instanceof Error && "code" in error && error.code === "refresh_token_not_found";
    if (!isRefreshTokenError) {
      console.error("proxy.ts: unexpected auth error", error);
    }
    // Baik expected maupun tidak, request tetap jalan tanpa session —
    // halaman protected akan redirect sendiri kalau perlu.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
