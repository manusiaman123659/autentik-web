import { NextResponse } from "next/server";
import type { cookies } from "next/headers";
import { authCookieName, rememberCookie } from "@/lib/auth-cookie-policy";
import { RECOVERY_COOKIE, recoveryCookieOptions, destroyRecoveryContext } from "@/lib/admin-password-recovery";

export function authResponseHeaders(sdkHeaders?: Headers) {
  const headers = new Headers();
  headers.set("Cache-Control", sdkHeaders?.get("Cache-Control") ?? "private, no-store");
  headers.set("Expires", "0");
  headers.set("Pragma", "no-cache");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Robots-Tag", "noindex");
  headers.set("Vary", "Cookie");
  return headers;
}

export function authJson(body: unknown, status = 200, sdkHeaders?: Headers) {
  return NextResponse.json(body, { status, headers: authResponseHeaders(sdkHeaders) });
}

export function clearLocalAuthCookies(store: Awaited<ReturnType<typeof cookies>>) {
  const base = authCookieName(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  for (const cookie of store.getAll()) {
    if (cookie.name === base || cookie.name.startsWith(`${base}.`) || cookie.name.startsWith(`${base}-`)) {
      store.set(cookie.name, "", { path: "/", maxAge: 0, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    }
  }
  const preference = rememberCookie("");
  store.set(preference.name, preference.value, preference.options);
  destroyRecoveryContext(store.get(RECOVERY_COOKIE)?.value);
  store.set(RECOVERY_COOKIE, "", { ...recoveryCookieOptions(), maxAge: 0 });
}
