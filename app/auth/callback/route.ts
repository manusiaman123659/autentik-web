import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSafeCustomerRedirect } from "@/lib/auth-redirect";
import { getCanonicalOrigin } from "@/lib/public-url";
import { APPLICATION_ROLES, isCmsRole } from "@/lib/admin-permissions";
import { getPublicRoute, localizeHref } from "@/i18n/locales";

export async function GET(request: NextRequest) {
  // Audit log request origin and proxy headers safely (NO cookies, tokens, or codes)
  console.log("[OAuth Callback] Origin & proxy headers:", {
    nextUrlOrigin: request.nextUrl.origin,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });

  const callbackOrigin = process.env.NODE_ENV === "development"
    && request.nextUrl.origin === "http://localhost:3000"
    ? request.nextUrl.origin
    : getCanonicalOrigin(request.nextUrl.origin);
  const redirect = (path: string) => NextResponse.redirect(new URL(
    localizeHref(path, getPublicRoute(safeNext.split("?")[0])?.locale ?? "id"), callbackOrigin,
  ));

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDesc = requestUrl.searchParams.get("error_description");

  // Always compute safe customer redirect target server-side
  const safeNext = getSafeCustomerRedirect(next, "/store");

  // If OAuth provider returned an error or user cancelled
  if (oauthError || !code) {
    if (oauthError) {
      console.warn("[OAuth Callback] Provider error:", oauthError, oauthErrorDesc);
    }
    return redirect("/auth/login?error=oauth_failed");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Exchange PKCE code for session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[OAuth Callback] exchangeCodeForSession error:", exchangeError.message);
    return redirect("/auth/login?error=oauth_failed");
  }

  // 2. Fetch authenticated user from trusted server source
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[OAuth Callback] getUser error after exchange:", userError?.message);
    await supabase.auth.signOut();
    return redirect("/auth/login?error=oauth_failed");
  }

  // 3. Load profile from database (created synchronously by handle_new_user trigger)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active, email")
    .eq("id", user.id)
    .maybeSingle();

  // 3A. Unexpected database query error -> fail closed
  if (profileError) {
    console.error("[OAuth Callback] Database error fetching profile:", user.id, profileError.message);
    await supabase.auth.signOut();
    return redirect("/auth/login?error=oauth_failed");
  }

  // 3B. Profile record genuinely not found -> fail closed
  if (!profile) {
    console.warn("[OAuth Callback] Profile not found for authenticated user:", user.id);
    await supabase.auth.signOut();
    return redirect("/auth/login?error=oauth_profile_missing");
  }

  // 4. Inactive account verification
  if (!profile.is_active) {
    console.warn("[OAuth Callback] Inactive account attempted login:", user.id);
    await supabase.auth.signOut();
    return redirect("/auth/login?error=oauth_inactive");
  }

  // 5. Customer role authorization (reject every CMS, legacy, or unknown role).
  if (profile.role !== "customer") {
    console.warn(`[OAuth Callback] Non-customer role '${profile.role}' attempted customer login:`, user.id);
    await supabase.auth.signOut();
    return redirect("/auth/login?error=oauth_not_customer");
  }

  // 6. Staff email collision guard:
  // Must use server-only admin client to bypass RLS, because authenticated customer
  // cannot SELECT other users' profiles under RLS policies.
  if (user.email) {
    try {
      const adminSupabase = createAdminClient();
      const normalizedEmail = user.email.trim().toLowerCase();
      const { data: staffCollision, error: staffCollisionError } = await adminSupabase
        .from("profiles")
        .select("id")
        .neq("id", user.id)
        .ilike("email", normalizedEmail)
        .in("role", APPLICATION_ROLES.filter(isCmsRole))
        .eq("is_active", true)
        .limit(1);

      if (staffCollisionError) {
        console.error("[OAuth Callback] Staff collision query error:", staffCollisionError.message);
        await supabase.auth.signOut();
        return redirect("/auth/login?error=oauth_failed");
      }

      if (staffCollision && staffCollision.length > 0) {
        console.warn("[OAuth Callback] Active staff email collision detected for:", user.email);
        await supabase.auth.signOut();
        return redirect("/auth/login?error=oauth_not_customer");
      }
    } catch (adminClientError) {
      console.error("[OAuth Callback] Failed to initialize admin client for collision check:", adminClientError);
      await supabase.auth.signOut();
      return redirect("/auth/login?error=oauth_failed");
    }
  }

  // 7. Successful authentication and authorization -> redirect to safe customer route
  return redirect(safeNext);
}
