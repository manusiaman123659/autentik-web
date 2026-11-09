import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { authJson, clearLocalAuthCookies } from "@/lib/auth-response";
import { claimRecoveryContext, destroyRecoveryContext, hasSameAuthOrigin, RECOVERY_COOKIE, releaseRecoveryContext, validateRecoveryContext } from "@/lib/admin-password-recovery";
import { resetPasswordSchema } from "@/lib/validations/passwordRecoverySchema";

export async function GET() {
  const store = await cookies();
  const headers = new Headers();
  const valid = !!await validateRecoveryContext(createClient(store, headers), store.get(RECOVERY_COOKIE)?.value);
  return authJson({ valid }, 200, headers);
}

export async function POST(request: Request) {
  if (!hasSameAuthOrigin(request)) return authJson({ success: false, message: "Permintaan tidak diizinkan." }, 403);
  const store = await cookies();
  const headers = new Headers();
  const client = createClient(store, headers);
  const nonce = store.get(RECOVERY_COOKIE)?.value;
  if (!nonce || !await validateRecoveryContext(client, nonce)) {
    return authJson({ success: false, needsNewLink: true, message: "Sesi pemulihan tidak valid atau kedaluwarsa. Minta tautan baru." }, 403, headers);
  }
  let input: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 8192) return authJson({ success: false, message: "Permintaan terlalu besar." }, 400, headers);
    input = JSON.parse(text);
  } catch { return authJson({ success: false, message: "Periksa format permintaan." }, 400, headers); }
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return authJson({ success: false, message: parsed.error.issues[0].message }, 400, headers);
  if (!claimRecoveryContext(nonce)) return authJson({ success: false, needsNewLink: true, message: "Pemulihan sedang diproses atau sudah digunakan." }, 409, headers);
  try {
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) {
      // A lost response/5xx may follow a committed update; only definite rejections allow retry.
      if (error.name !== "AuthApiError" || !error.status || error.status < 400 || error.status >= 500 || error.status === 408) throw error;
      releaseRecoveryContext(nonce);
      return authJson({ success: false, passwordUpdated: false, message: error.code === "weak_password" ? "Kata sandi belum memenuhi kebijakan keamanan. Gunakan kata sandi yang lebih kuat." : "Kata sandi belum dapat diperbarui. Periksa isian dan coba kembali." }, 400, headers);
    }
  } catch {
    destroyRecoveryContext(nonce);
    clearLocalAuthCookies(store);
    return authJson({ success: false, passwordUpdated: null, needsNewLink: true, message: "Hasil pembaruan belum dapat dipastikan. Masuk ulang atau minta tautan pemulihan baru." }, 502, headers);
  }
  destroyRecoveryContext(nonce);
  let signedOut = false;
  try {
    const { data: { session }, error } = await client.auth.getSession();
    // User signOut normalizes 401/403; inspect raw revocation using this user's JWT, not a service key.
    if (!error && session) signedOut = !(await client.auth.admin.signOut(session.access_token, "global")).error;
  }
  catch { /* Password changed; report remote logout failure separately. */ }
  finally { clearLocalAuthCookies(store); }
  return authJson({
    success: signedOut, passwordUpdated: true, signedOut,
    message: signedOut ? "Kata sandi berhasil diperbarui. Silakan masuk kembali."
      : "Kata sandi sudah diperbarui dan sesi perangkat ini dibersihkan, tetapi logout semua perangkat belum terkonfirmasi. Sesi di perangkat lain mungkin masih aktif. Silakan masuk ulang dan hubungi pengelola untuk memeriksa sesi lain.",
  }, signedOut ? 200 : 502, headers);
}
