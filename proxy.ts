import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { getCareerRoutingResponse } from "@/lib/api/career-routing";
import createLocaleRouting from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { getPublicRoute } from "@/i18n/locales";

const routeLocale = createLocaleRouting(routing);

async function refreshSession(request: NextRequest) {
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

export async function proxy(request: NextRequest) {
  // Existing session-refresh logic runs first and is otherwise unchanged.
  const sessionResponse = await refreshSession(request);
  const internalPath = request.nextUrl.pathname.replace(/^\/zh-CN(?=\/|$)/, "/zh-cn");
  const internalRoute = getPublicRoute(internalPath);
  if (/^\/(?:id|zh-CN)(?:\/|$)/.test(request.nextUrl.pathname)
    && internalRoute?.prefixed
    && request.headers.get("x-public-pathname") === internalRoute.pathname) {
    // Next 16 re-enters proxy on next-intl's internal rewrite; do not redirect it back to its public URL.
    const careerRequest = internalPath !== request.nextUrl.pathname
      && (request.method === "GET" || request.method === "HEAD")
      ? new NextRequest(new URL(internalPath + request.nextUrl.search, request.url), {
          method: request.method, headers: request.headers,
        })
      : request;
    const careerResponse = await getCareerRoutingResponse(careerRequest);
    const response = careerResponse ?? sessionResponse;
    for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
    return response;
  }
  if (/^\/zh-CN(?:\/|$)/.test(request.nextUrl.pathname)) {
    const normalized = request.nextUrl.clone();
    normalized.pathname = normalized.pathname.replace(/^\/zh-CN/, "/zh-cn");
    if (getPublicRoute(normalized.pathname)) {
      const response = NextResponse.redirect(normalized, 308);
      for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
      return response;
    }
  }
  const route = getPublicRoute(request.nextUrl.pathname);
  if (!route) {
    const careerResponse = await getCareerRoutingResponse(request);
    if (!careerResponse) return sessionResponse;
    for (const cookie of sessionResponse.cookies.getAll()) careerResponse.cookies.set(cookie);
    return careerResponse;
  }
  // Overwrite incoming values; metadata must describe the actual public route.
  request.headers.set("x-public-pathname", route.pathname);
  const localeResponse = routeLocale(request);
  if (localeResponse.headers.has("location")) {
    for (const cookie of sessionResponse.cookies.getAll()) localeResponse.cookies.set(cookie);
    return localeResponse;
  }
  const careerResponse = await getCareerRoutingResponse(request);
  const response = careerResponse ?? localeResponse;
  for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
