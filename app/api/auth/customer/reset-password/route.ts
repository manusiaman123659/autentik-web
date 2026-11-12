import { authJson } from "@/lib/auth-response";
import { LimitedJsonBodyError, readJsonBodyWithLimit } from "@/lib/limited-json-body";
import { checkRateLimit } from "@/lib/rate-limit";
import { customerResetPasswordSchema } from "@/lib/validations/passwordRecoverySchema";
import {
  CUSTOMER_RECOVERY_INVALID_MESSAGE,
  CUSTOMER_RECOVERY_REJECTED_MESSAGE,
  CUSTOMER_RECOVERY_UNAVAILABLE_MESSAGE,
  createDefaultCustomerRecoveryDeps,
  digestCustomerRecoveryToken,
  getCustomerRecoveryRequestIp,
  hasSameCustomerRecoveryOrigin,
  resetCustomerPassword,
  type CustomerPasswordResetResult,
} from "@/lib/customer-recovery";

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

  const parsed = customerResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return authJson({ success: false, message: parsed.error.issues[0]?.message ?? "Periksa isian reset kata sandi." }, 400);
  }

  const ip = getCustomerRecoveryRequestIp(request);
  if (!checkRateLimit(`customer-recovery:reset:ip:${ip}`, 20, 60_000).allowed) {
    const response = authJson({ success: false, message: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }

  let digest: string;
  try {
    digest = digestCustomerRecoveryToken(parsed.data.token);
  } catch {
    return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
  }

  if (!checkRateLimit(`customer-recovery:reset:token:${digest}`, 10, 60_000).allowed) {
    const response = authJson({ success: false, message: "Terlalu banyak permintaan. Tunggu sebelum mencoba kembali." }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }

  let result: CustomerPasswordResetResult;
  try {
    result = await resetCustomerPassword(
      { token: parsed.data.token, password: parsed.data.password },
      createDefaultCustomerRecoveryDeps(),
    );
  } catch {
    return authJson({ success: false, message: "Layanan pemulihan sementara tidak tersedia." }, 503);
  }

  if (result.status === "success") {
    return authJson({
      success: true,
      passwordUpdated: true,
      sessionsRevoked: result.sessionsRevoked,
      message: result.sessionsRevoked
        ? "Kata sandi berhasil diperbarui. Silakan masuk kembali."
        : "Kata sandi berhasil diperbarui, tetapi logout semua perangkat belum terkonfirmasi. Sesi di perangkat lain mungkin masih aktif. Silakan masuk kembali.",
    }, 200);
  }

  if (result.status === "rejected") {
    return authJson({
      success: false,
      passwordUpdated: false,
      needsNewLink: true,
      message: CUSTOMER_RECOVERY_REJECTED_MESSAGE,
    }, 400);
  }

  if (result.status === "unavailable") {
    return authJson({
      success: false,
      passwordUpdated: null,
      needsNewLink: true,
      message: CUSTOMER_RECOVERY_UNAVAILABLE_MESSAGE,
    }, 502);
  }

  return authJson({
    success: false,
    passwordUpdated: false,
    needsNewLink: true,
    message: CUSTOMER_RECOVERY_INVALID_MESSAGE,
  }, 400);
}
