import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { forgotPasswordSchema } from "@/lib/validations/passwordRecoverySchema";
import { hasSameAuthOrigin, NEUTRAL_RECOVERY_MESSAGE } from "@/lib/admin-password-recovery";
import { authJson } from "@/lib/auth-response";
import { getCanonicalOrigin } from "@/lib/public-url";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!hasSameAuthOrigin(request)) return authJson({ success: false, message: "Permintaan tidak diizinkan." }, 403);
  let input: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 8192) return authJson({ success: false, message: "Permintaan terlalu besar." }, 400);
    input = JSON.parse(text);
  } catch { return authJson({ success: false, message: "Periksa format permintaan." }, 400); }
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return authJson({ success: false, message: "Masukkan alamat email yang valid." }, 400);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 128) || request.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(`admin-recovery:ip:${ip}`, 5, 15 * 60_000).allowed) {
    const response = authJson({ success: false, message: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }
  const emailKey = createHash("sha256").update(parsed.data.email.toLowerCase()).digest("hex");
  const headers = new Headers();
  if (checkRateLimit(`admin-recovery:email:${emailKey}`, 1, 60_000).allowed) {
    try {
      const client = createClient(await cookies(), headers);
      await client.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${getCanonicalOrigin(request.url)}/auth/recovery` });
    } catch {
      // Account existence and provider failures must not change the public response.
    }
  }
  const response = authJson({ success: true, message: NEUTRAL_RECOVERY_MESSAGE }, 202, headers);
  response.headers.set("Retry-After", "60");
  return response;
}
