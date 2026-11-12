import { createAdminClient } from "@/utils/supabase/admin";
import { authJson } from "@/lib/auth-response";
import { LimitedJsonBodyError, readJsonBodyWithLimit } from "@/lib/limited-json-body";
import { checkRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/passwordRecoverySchema";
import {
  CUSTOMER_RECOVERY_NEUTRAL_MESSAGE,
  digestCustomerRecoveryToken,
  generateCustomerRecoveryToken,
  getCustomerRecoveryRequestIp,
  getCustomerRecoveryUrl,
  hasSameCustomerRecoveryOrigin,
  hashCustomerRecoveryEmail,
} from "@/lib/customer-recovery";
import { CustomerRecoveryEmailError, sendCustomerRecoveryEmail } from "@/lib/customer-recovery-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSameCustomerRecoveryOrigin(request)) {
    return authJson({ success: false, message: "Permintaan tidak diizinkan." }, 403);
  }

  let input: unknown;
  try {
    input = await readJsonBodyWithLimit(request, 8192);
  } catch (error) {
    if (error instanceof LimitedJsonBodyError) {
      return authJson(
        { success: false, message: error.reason === "too_large" ? "Permintaan terlalu besar." : "Periksa format permintaan." },
        error.reason === "too_large" ? 413 : 400,
      );
    }
    throw error;
  }

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return authJson({ success: false, message: "Masukkan alamat email yang valid." }, 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = getCustomerRecoveryRequestIp(request);
  if (!checkRateLimit(`customer-recovery:forgot:ip:${ip}`, 10, 15 * 60_000).allowed) {
    const response = authJson({ success: false, message: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }

  let token: string;
  let digest: string;
  let emailKey: string;
  try {
    token = generateCustomerRecoveryToken();
    digest = digestCustomerRecoveryToken(token);
    emailKey = hashCustomerRecoveryEmail(email);
  } catch {
    return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
  }

  if (!checkRateLimit(`customer-recovery:forgot:email:${emailKey}`, 3, 15 * 60_000).allowed) {
    const response = authJson({ success: false, message: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
  }

  let recoveryId: unknown;
  try {
    const { data, error } = await admin.rpc("issue_customer_password_recovery", {
      p_email: email,
      p_token_digest: digest,
      p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    if (error) {
      return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
    }
    recoveryId = data;
  } catch {
    return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
  }

  if (typeof recoveryId !== "string") {
    const response = authJson({ success: true, message: CUSTOMER_RECOVERY_NEUTRAL_MESSAGE }, 202);
    response.headers.set("Retry-After", "60");
    return response;
  }

  try {
    await sendCustomerRecoveryEmail({
      to: email,
      recoveryUrl: getCustomerRecoveryUrl(request.url, token),
    });
  } catch (error) {
    if (error instanceof CustomerRecoveryEmailError && error.delivery === "definitive") {
      try {
        await admin.rpc("fail_customer_password_recovery_delivery", {
          p_recovery_id: recoveryId,
          p_failure_code: error.code,
        });
      } catch {
        // The issued row expires after 15 minutes; never change the neutral response.
      }
    }
  }

  const response = authJson({ success: true, message: CUSTOMER_RECOVERY_NEUTRAL_MESSAGE }, 202);
  response.headers.set("Retry-After", "60");
  return response;
}
