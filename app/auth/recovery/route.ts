import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalOrigin } from "@/lib/public-url";
import { authResponseHeaders, clearLocalAuthCookies } from "@/lib/auth-response";
import { destroyRecoveryContext, getCmsRecoveryIdentity, issueRecoveryContext, RECOVERY_COOKIE, recoveryCookieOptions } from "@/lib/admin-password-recovery";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const origin = getCanonicalOrigin(request.url);
  const store = await cookies();
  const headers = new Headers();
  destroyRecoveryContext(store.get(RECOVERY_COOKIE)?.value);
  store.set(RECOVERY_COOKIE, "", { ...recoveryCookieOptions(), maxAge: 0 });
  const redirect = (valid: boolean) => NextResponse.redirect(new URL(valid ? "/admin/reset-password" : "/admin/forgot-password?error=recovery_invalid", origin), { status: 303, headers: authResponseHeaders(headers) });
  const query = new URL(request.url).searchParams;
  const tokenHash = query.get("token_hash");
  if (query.getAll("token_hash").length !== 1 || query.getAll("type").length !== 1
    || query.get("type") !== "recovery" || !tokenHash || !/^[A-Za-z0-9_-]{32,512}$/.test(tokenHash)
    || (query.has("next") && (query.getAll("next").length !== 1 || query.get("next") !== "/admin/reset-password"))) return redirect(false);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 128) || "unknown";
  if (!checkRateLimit(`admin-recovery:verify:${ip}`, 10, 60_000).allowed) return redirect(false);
  const client = createClient(store, headers);
  try {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) return redirect(false);
    const identity = await getCmsRecoveryIdentity(client);
    if (!identity) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      clearLocalAuthCookies(store);
      return redirect(false);
    }
    const nonce = issueRecoveryContext(identity);
    store.set(RECOVERY_COOKIE, nonce, recoveryCookieOptions());
    return redirect(true);
  } catch {
    await client.auth.signOut({ scope: "local" }).catch(() => {});
    clearLocalAuthCookies(store);
    return redirect(false);
  }
}
