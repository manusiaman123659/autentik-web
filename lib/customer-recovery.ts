import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCanonicalOrigin } from "@/lib/public-url";

export const CUSTOMER_RECOVERY_PATH = "/auth/reset-password";
export const CUSTOMER_RECOVERY_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export const CUSTOMER_RECOVERY_NEUTRAL_MESSAGE =
  "Jika email terdaftar sebagai akun customer aktif, tautan reset kata sandi akan dikirim. Periksa kotak masuk dan folder spam.";
export const CUSTOMER_RECOVERY_INVALID_MESSAGE =
  "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.";
export const CUSTOMER_RECOVERY_REJECTED_MESSAGE =
  "Kata sandi belum memenuhi kebijakan keamanan. Gunakan kata sandi yang lebih kuat, lalu minta tautan baru.";
export const CUSTOMER_RECOVERY_UNAVAILABLE_MESSAGE =
  "Hasil pembaruan belum dapat dipastikan. Masuk ulang atau minta tautan pemulihan baru.";

export type CustomerRecoveryIdentity = {
  id: string;
  email: string | null;
  deletedAt: string | null;
  bannedUntil: string | null;
};

export type CustomerRecoveryProfile = {
  role: string;
  isActive: boolean;
};

export type CustomerRecoveryLinkResult =
  | { ok: true; tokenHash: string }
  | { ok: false; error: unknown };

export type CustomerPasswordResetResult =
  | { status: "success"; passwordUpdated: true; sessionsRevoked: boolean }
  | { status: "invalid"; code: "invalid_token" | "identity_not_eligible" | "identity_changed" }
  | { status: "rejected"; code: "password_rejected" }
  | { status: "unavailable"; code: "auth_unavailable" | "password_update_ambiguous" };

export type CustomerRecoveryAuthSession = {
  verifyRecoveryToken(tokenHash: string): Promise<{ error: unknown | null }>;
  getUser(): Promise<{ id: string } | null>;
  updatePassword(password: string): Promise<{ error: unknown | null }>;
  getAccessToken(): Promise<string | null>;
  globalSignOut(accessToken: string): Promise<{ error: unknown | null }>;
};

export type CustomerRecoveryDeps = {
  claim(tokenDigest: string): Promise<{ recoveryId: string; userId: string } | null>;
  finish(recoveryId: string, outcome: "consumed" | "failed", failureCode?: string): Promise<boolean>;
  getUserById(userId: string): Promise<CustomerRecoveryIdentity | null>;
  getProfile(userId: string): Promise<CustomerRecoveryProfile | null>;
  generateRecoveryTokenHash(email: string): Promise<CustomerRecoveryLinkResult>;
  createAuthSession(): CustomerRecoveryAuthSession;
};

export function getCustomerRecoverySecret(): string {
  const secret = process.env.CUSTOMER_RECOVERY_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("CUSTOMER_RECOVERY_TOKEN_SECRET wajib berisi minimal 32 karakter.");
  }
  return secret;
}

export function generateCustomerRecoveryToken(): string {
  return randomBytes(32).toString("hex");
}

export function isCustomerRecoveryToken(value: unknown): value is string {
  return typeof value === "string" && CUSTOMER_RECOVERY_TOKEN_PATTERN.test(value);
}

export function digestCustomerRecoveryToken(token: string): string {
  if (!isCustomerRecoveryToken(token)) throw new Error("Token pemulihan tidak valid.");
  return createHmac("sha256", getCustomerRecoverySecret()).update(token, "utf8").digest("hex");
}

export function hashCustomerRecoveryEmail(email: string): string {
  return createHmac("sha256", getCustomerRecoverySecret())
    .update(email.trim().toLowerCase(), "utf8")
    .digest("hex");
}

export function buildCustomerRecoveryUrl(origin: string, token: string): string {
  if (!isCustomerRecoveryToken(token)) throw new Error("Token pemulihan tidak valid.");
  return `${origin.replace(/\/+$/, "")}${CUSTOMER_RECOVERY_PATH}#token=${encodeURIComponent(token)}`;
}

export function getCustomerRecoveryUrl(requestUrl: string, token: string): string {
  return buildCustomerRecoveryUrl(getCanonicalOrigin(requestUrl), token);
}

export function hasSameCustomerRecoveryOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === getCanonicalOrigin(request.url);
  } catch {
    return false;
  }
}

export function getCustomerRecoveryRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "unknown").slice(0, 128);
}

function hasDefiniteAuthRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ((error as { code?: unknown }).code === "weak_password") return true;
  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number" || !Number.isFinite(status)) return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function isEligibleIdentity(identity: CustomerRecoveryIdentity | null): identity is CustomerRecoveryIdentity & { email: string } {
  if (!identity || identity.deletedAt) return false;
  if (identity.bannedUntil && Date.parse(identity.bannedUntil) > Date.now()) return false;
  return typeof identity.email === "string" && identity.email.trim().length > 0;
}

function isEligibleProfile(profile: CustomerRecoveryProfile | null): boolean {
  return profile?.role === "customer" && profile.isActive === true;
}

export async function resetCustomerPassword(
  input: { token: string; password: string },
  deps: CustomerRecoveryDeps,
): Promise<CustomerPasswordResetResult> {
  const claim = await deps.claim(digestCustomerRecoveryToken(input.token));
  if (!claim) return { status: "invalid", code: "invalid_token" };

  const finishFailed = async (failureCode: string) => {
    try {
      await deps.finish(claim.recoveryId, "failed", failureCode);
    } catch {
      // Claimed rows expire after 30 minutes; never report a second failure as success.
    }
  };

  let authSession: CustomerRecoveryAuthSession;
  try {
    authSession = deps.createAuthSession();
  } catch {
    await finishFailed("auth_session_failed");
    return { status: "unavailable", code: "auth_unavailable" };
  }

  let identity: CustomerRecoveryIdentity | null;
  let profile: CustomerRecoveryProfile | null;
  try {
    identity = await deps.getUserById(claim.userId);
    profile = identity ? await deps.getProfile(claim.userId) : null;
  } catch {
    await finishFailed("identity_lookup_failed");
    return { status: "unavailable", code: "auth_unavailable" };
  }

  if (!isEligibleIdentity(identity) || !isEligibleProfile(profile)) {
    await finishFailed("identity_not_eligible");
    return { status: "invalid", code: "identity_not_eligible" };
  }

  let generated: CustomerRecoveryLinkResult;
  try {
    generated = await deps.generateRecoveryTokenHash(identity.email);
  } catch (error) {
    generated = { ok: false, error };
  }
  if (!generated.ok) {
    await finishFailed("generate_recovery_link_failed");
    return hasDefiniteAuthRejection(generated.error)
      ? { status: "invalid", code: "identity_changed" }
      : { status: "unavailable", code: "auth_unavailable" };
  }

  let verified: { error: unknown | null };
  try {
    verified = await authSession.verifyRecoveryToken(generated.tokenHash);
  } catch (error) {
    verified = { error };
  }
  if (verified.error) {
    await finishFailed("verify_recovery_token_failed");
    return hasDefiniteAuthRejection(verified.error)
      ? { status: "invalid", code: "identity_changed" }
      : { status: "unavailable", code: "auth_unavailable" };
  }

  let sessionUser: { id: string } | null;
  try {
    sessionUser = await authSession.getUser();
  } catch {
    sessionUser = null;
  }
  if (!sessionUser || sessionUser.id !== claim.userId) {
    await finishFailed("identity_mismatch");
    return { status: "invalid", code: "identity_changed" };
  }

  let profileBeforeUpdate: CustomerRecoveryProfile | null;
  try {
    profileBeforeUpdate = await deps.getProfile(claim.userId);
  } catch {
    await finishFailed("identity_recheck_failed");
    return { status: "unavailable", code: "auth_unavailable" };
  }
  if (!isEligibleProfile(profileBeforeUpdate)) {
    await finishFailed("identity_changed");
    return { status: "invalid", code: "identity_changed" };
  }

  let updated: { error: unknown | null };
  try {
    updated = await authSession.updatePassword(input.password);
  } catch (error) {
    updated = { error };
  }
  if (updated.error) {
    const definite = hasDefiniteAuthRejection(updated.error);
    await finishFailed(definite ? "password_update_failed" : "password_update_ambiguous");
    return definite
      ? { status: "rejected", code: "password_rejected" }
      : { status: "unavailable", code: "password_update_ambiguous" };
  }

  try {
    await deps.finish(claim.recoveryId, "consumed");
  } catch {
    // The claimed token is already single-use; consumed bookkeeping is best effort.
  }

  let sessionsRevoked = false;
  try {
    const accessToken = await authSession.getAccessToken();
    if (accessToken) sessionsRevoked = !(await authSession.globalSignOut(accessToken)).error;
  } catch {
    sessionsRevoked = false;
  }

  return { status: "success", passwordUpdated: true, sessionsRevoked };
}

function createIsolatedAuthSession(): CustomerRecoveryAuthSession {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Konfigurasi Supabase Auth tidak tersedia.");

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  return {
    async verifyRecoveryToken(tokenHash) {
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      return { error };
    },
    async getUser() {
      const { data, error } = await client.auth.getUser();
      return error || !data.user ? null : { id: data.user.id };
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      return { error };
    },
    async getAccessToken() {
      const { data, error } = await client.auth.getSession();
      return error ? null : data.session?.access_token ?? null;
    },
    async globalSignOut(accessToken) {
      const { error } = await client.auth.admin.signOut(accessToken, "global");
      return { error };
    },
  };
}

export function createDefaultCustomerRecoveryDeps(): CustomerRecoveryDeps {
  const admin = createAdminClient();

  return {
    async claim(tokenDigest) {
      const { data, error } = await admin.rpc("claim_customer_password_recovery", {
        p_token_digest: tokenDigest,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { recovery_id?: unknown; user_id?: unknown }
        | null
        | undefined;
      if (typeof row?.recovery_id !== "string" || typeof row.user_id !== "string") return null;
      return { recoveryId: row.recovery_id, userId: row.user_id };
    },
    async finish(recoveryId, outcome, failureCode) {
      const { data, error } = await admin.rpc("finish_customer_password_recovery", {
        p_recovery_id: recoveryId,
        p_outcome: outcome,
        p_failure_code: failureCode ?? null,
      });
      if (error) throw error;
      return data === true;
    },
    async getUserById(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user) return null;
      return {
        id: data.user.id,
        email: data.user.email ?? null,
        deletedAt: data.user.deleted_at ?? null,
        bannedUntil: data.user.banned_until ?? null,
      };
    },
    async getProfile(userId) {
      const { data, error } = await admin
        .from("profiles")
        .select("role, is_active")
        .eq("id", userId)
        .maybeSingle();
      const row = data as { role?: unknown; is_active?: unknown } | null;
      if (error || !row || typeof row.role !== "string") return null;
      return { role: row.role, isActive: row.is_active === true };
    },
    async generateRecoveryTokenHash(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (error) return { ok: false, error };
      const tokenHash = data?.properties?.hashed_token;
      if (typeof tokenHash !== "string" || tokenHash.length === 0) {
        return { ok: false, error: new Error("hashed_token tidak tersedia.") };
      }
      return { ok: true, tokenHash };
    },
    createAuthSession: createIsolatedAuthSession,
  };
}
