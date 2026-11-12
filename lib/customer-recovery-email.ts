import "server-only";
import { isLocalHostname } from "@/lib/public-url";

export class CustomerRecoveryEmailError extends Error {
  constructor(
    public readonly delivery: "definitive" | "ambiguous",
    public readonly code: string,
  ) {
    super(code);
    this.name = "CustomerRecoveryEmailError";
  }
}

const RESEND_TIMEOUT_MS = 10_000;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function getResendEndpoint(): string {
  const configured = process.env.RESEND_API_URL?.trim();
  let endpoint: URL;
  try {
    endpoint = new URL(configured || "https://api.resend.com/emails");
  } catch {
    throw new CustomerRecoveryEmailError("definitive", "resend_config");
  }
  const localHttp =
    process.env.NODE_ENV !== "production" &&
    endpoint.protocol === "http:" &&
    isLocalHostname(endpoint.hostname);
  if ((endpoint.protocol !== "https:" && !localHttp) || endpoint.username || endpoint.password) {
    throw new CustomerRecoveryEmailError("definitive", "resend_config");
  }
  return endpoint.toString();
}

function getRecoveryUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CustomerRecoveryEmailError("definitive", "invalid_recovery_url");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    !url.hash.startsWith("#token=")
  ) {
    throw new CustomerRecoveryEmailError("definitive", "invalid_recovery_url");
  }
  return url.toString();
}

export async function sendCustomerRecoveryEmail(input: {
  to: string;
  recoveryUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from || !from.includes("@")) {
    throw new CustomerRecoveryEmailError("definitive", "resend_config");
  }
  if (!input.to.includes("@")) {
    throw new CustomerRecoveryEmailError("definitive", "invalid_recipient");
  }

  const endpoint = getResendEndpoint();
  const recoveryUrl = getRecoveryUrl(input.recoveryUrl);
  const safeUrl = escapeHtml(recoveryUrl);
  const subject = "Atur ulang kata sandi akun Autentik";
  const text = [
    "Kami menerima permintaan untuk mengatur ulang kata sandi akun Autentik Anda.",
    "",
    "Buka tautan berikut untuk membuat kata sandi baru:",
    recoveryUrl,
    "",
    "Tautan berlaku 15 menit dan hanya dapat digunakan sekali.",
    "Jika Anda tidak meminta reset kata sandi, abaikan email ini.",
    "Jangan teruskan email ini kepada siapa pun.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="id">
<body style="margin:0;background:#f4f7f7;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#ffffff;border:1px solid #dbe4e4;border-radius:8px;padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35">Atur ulang kata sandi akun Autentik</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6">Kami menerima permintaan untuk mengatur ulang kata sandi akun Autentik Anda.</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Buat kata sandi baru melalui tombol berikut.</p>
      <p style="margin:0 0 20px">
        <a href="${safeUrl}" style="display:inline-block;background:#0ea5a0;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">Atur Ulang Kata Sandi</a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.6">Tautan berlaku 15 menit dan hanya dapat digunakan sekali.</p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.6">Jika Anda tidak meminta reset kata sandi, abaikan email ini.</p>
      <p style="margin:0;font-size:13px;line-height:1.6">Jangan teruskan email ini kepada siapa pun.</p>
    </div>
  </div>
</body>
</html>`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html,
        text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch {
    throw new CustomerRecoveryEmailError("ambiguous", "resend_network");
  }

  if (!response.ok) {
    throw new CustomerRecoveryEmailError("definitive", `resend_${response.status}`);
  }
}
