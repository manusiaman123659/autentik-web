import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Jika env Supabase belum dikonfigurasi, lanjutkan request tanpa refresh session
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  try {
    const { supabase, supabaseResponse } = createClient(request);

    // Refresh the auth session (if expired) and propagate the new cookies.
    // Do not run code between createServerClient and auth.getUser().
    await supabase.auth.getUser();
    return supabaseResponse;
  } catch (error) {
    const isRefreshTokenError =
      error instanceof Error && "code" in error && error.code === "refresh_token_not_found";
    if (!isRefreshTokenError) {
      console.error("proxy.ts: unexpected auth error", error);
    }
    // Baik expected maupun tidak, request tetap jalan tanpa session —
    // halaman protected akan redirect sendiri kalau perlu.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
