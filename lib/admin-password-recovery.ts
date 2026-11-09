import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCmsRole } from "@/lib/admin-permissions";
import { getCanonicalOrigin } from "@/lib/public-url";

export const RECOVERY_COOKIE = "aka-admin-recovery";
export const RECOVERY_SECONDS = 600;
export const NEUTRAL_RECOVERY_MESSAGE = "Jika alamat email dapat digunakan untuk pemulihan, instruksi akan dikirim. Periksa kotak masuk dan folder spam.";
type Identity = { userId: string; sessionId: string };
type RecoveryContext = Identity & { expires: number; busy: boolean };
const key = Symbol.for("aka.admin-password-recovery");
const processState = globalThis as typeof globalThis & { [key]?: Map<string, RecoveryContext> };
// shortcut: contexts are per-process and fail closed on restart/instance switch; use an atomic shared store for multi-instance routing.
const contexts = processState[key] ??= new Map<string, RecoveryContext>();

export const recoveryCookieOptions = () => ({ path: "/", httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: RECOVERY_SECONDS });

export function issueRecoveryContext(identity: Identity) {
  for (const [nonce, context] of contexts) if (context.expires <= Date.now()) contexts.delete(nonce);
  if (contexts.size >= 1000) throw new Error("Recovery capacity reached");
  const nonce = randomBytes(32).toString("hex");
  contexts.set(nonce, { userId: identity.userId, sessionId: identity.sessionId, expires: Date.now() + RECOVERY_SECONDS * 1000, busy: false });
  return nonce;
}

export function destroyRecoveryContext(nonce: string | undefined) {
  if (nonce) contexts.delete(nonce);
}

function contextFor(nonce: string | undefined) {
  if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) return null;
  const context = contexts.get(nonce);
  if (!context || context.expires <= Date.now()) { contexts.delete(nonce); return null; }
  return context;
}

export function claimRecoveryContext(nonce: string) {
  const context = contextFor(nonce);
  if (!context || context.busy) return null;
  context.busy = true;
  return context;
}

export function releaseRecoveryContext(nonce: string) {
  const context = contextFor(nonce);
  if (context) context.busy = false;
}

export async function getCmsRecoveryIdentity(client: SupabaseClient): Promise<Identity | null> {
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) return null;
    // Token claims are used only after getUser verified this client's session.
    const claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString());
    if (claims.sub !== user.id || typeof claims.session_id !== "string"
      || !/^[0-9a-f-]{36}$/i.test(claims.session_id)) return null;
    const { data: profile, error: profileError } = await client.from("profiles").select("id, role, is_active").eq("id", user.id).maybeSingle();
    if (profileError || !profile || profile.id !== user.id || profile.is_active !== true || !isCmsRole(profile.role)) return null;
    return { userId: user.id, sessionId: claims.session_id };
  } catch { return null; }
}

export async function validateRecoveryContext(client: SupabaseClient, nonce: string | undefined) {
  const context = contextFor(nonce);
  if (!context || context.busy) return null;
  const identity = await getCmsRecoveryIdentity(client);
  if (!identity || context.expires <= Date.now() || context.busy
    || context.userId !== identity.userId || context.sessionId !== identity.sessionId) return null;
  return context;
}

export function hasSameAuthOrigin(request: Request) {
  try { return request.headers.get("origin") === getCanonicalOrigin(request.url); }
  catch { return false; }
}
