import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { rfqSchema } from "@/lib/validations/rfqSchema";
import { parseWhatsAppContacts, resolveWhatsAppContact } from "@/lib/communication";
import { LimitedJsonBodyError, readJsonBodyWithLimit } from "@/lib/limited-json-body";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SESSION_COOKIE = "autentik-rfq-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;
const MAX_CODE_ATTEMPTS = 10;
const MAX_BODY_BYTES = 16 * 1024;

function generateRfqCode(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RFQ-${datePart}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    // Global circuit breaker per application instance, separate from the session RPC quota.
    if (!checkRateLimit("rfq:global", 20, 10 * 60_000).allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }

    const body = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
    const parsed = rfqSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data tidak valid",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // ── Cookie handling: server generates/reads. Client NEVER sends. ──
    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value ?? randomUUID();

    const supabase = createClient(cookieStore);

    // ── Rate limit check via RPC ──
    let tracking;
    try {
      tracking = await supabase.rpc("track_rfq_submission", {
        p_session_id: sessionId,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
        p_max: RATE_LIMIT_MAX_SUBMISSIONS,
      });
    } catch {
      console.error("[api/rfq] rfq.limiter_unavailable", { code: "request_failed" });
      return NextResponse.json(
        { success: false, message: "Layanan permintaan penawaran sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }
    const { data: allowed, error: rpcError } = tracking;

    if (rpcError) {
      console.error("[api/rfq] rate_limit_failed", {
        code: /^[A-Z0-9]{5,8}$/.test(rpcError.code ?? "") ? rpcError.code : "unknown",
      });
      return NextResponse.json(
        { success: false, message: "Layanan permintaan penawaran sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }

    if (allowed === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Batas pengiriman RFQ tercapai (maks 3 per jam). Silakan coba lagi nanti.",
        },
        { status: 429 },
      );
    }

    if (allowed !== true) {
      console.error("[api/rfq] rfq.limiter_unavailable", { code: "invalid_response" });
      return NextResponse.json(
        { success: false, message: "Layanan permintaan penawaran sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }

    // ── Insert RFQ with retry on unique_violation (rfq_code collision) ──
    const adminSupabase = createAdminClient();
    let rfqCode: string | null = null;
    let lastErrorCode: string | null = null;

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateRfqCode();
      const { error: insertError } = await adminSupabase
        .from("quotation_requests")
        .insert({
          rfq_code: code,
          product_id:
            parsed.data.productId && parsed.data.productId !== ""
              ? parsed.data.productId
              : null,
          company_name: parsed.data.companyName,
          pic_name: parsed.data.picName,
          email: parsed.data.email,
          phone_number: parsed.data.phoneNumber,
          estimated_quantity: parsed.data.estimatedQuantity,
          target_date: parsed.data.targetDate || null,
          notes: parsed.data.notes || null,
        });

      if (!insertError) {
        rfqCode = code;
        break;
      }

      // unique_violation on rfq_code → retry with new code
      if (
        insertError.code === "23505" &&
        insertError.message?.includes("rfq_code")
      ) {
        lastErrorCode = null;
        continue;
      }

      // other error → stop immediately
      lastErrorCode = insertError.code;
      break;
    }

    if (!rfqCode) {
      console.error("[api/rfq] rfq.insert_failed", {
        code: lastErrorCode && /^[A-Z0-9]{5,8}$/.test(lastErrorCode)
          ? lastErrorCode
          : "unknown",
        category: lastErrorCode ? "database_error" : "code_collision",
      });
      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengirim permintaan penawaran. Silakan coba lagi.",
        },
        { status: 500 },
      );
    }

    // ── Fetch WhatsApp number ──
    const { data: waSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp")
      .maybeSingle();

    const mikaContact = resolveWhatsAppContact(
      parseWhatsAppContacts(waSetting?.value),
      "mika_rfq_followup",
    );

    let waUrl: string | undefined;
    if (mikaContact) {
      const msg = [
        `Halo Admin MIKA, saya ingin melanjutkan komunikasi mengenai permintaan penawaran (RFQ) yang telah saya kirim melalui website AKA.`,
        ``,
        `Kode RFQ: ${rfqCode}`,
        parsed.data.productName
          ? `Produk: ${parsed.data.productName}`
          : "",
        `Perusahaan: ${parsed.data.companyName}`,
        `PIC: ${parsed.data.picName}`,
        `Email: ${parsed.data.email}`,
        `HP: ${parsed.data.phoneNumber}`,
        `Jumlah Estimasi: ${parsed.data.estimatedQuantity} unit`,
        parsed.data.targetDate
          ? `Target Tanggal: ${parsed.data.targetDate}`
          : "",
        parsed.data.notes ? `Catatan: ${parsed.data.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      waUrl = `https://wa.me/${mikaContact.number}?text=${encodeURIComponent(msg)}`;
    }

    // ── Response + set cookie ──
    const response = NextResponse.json({
      success: true,
      message: "Permintaan penawaran berhasil dikirim.",
      rfqCode,
      waUrl,
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof LimitedJsonBodyError) {
      return NextResponse.json(
        { success: false, message: error.reason === "too_large" ? "Permintaan terlalu besar." : "Format JSON tidak valid." },
        { status: error.reason === "too_large" ? 413 : 400 },
      );
    }
    console.error("[api/rfq] rfq.unexpected_error", {
      category: "unexpected",
    });
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
