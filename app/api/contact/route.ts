import { NextRequest, NextResponse } from "next/server";
import { contactOrCustomSchema } from "@/lib/validations/contactSchema";
import { createAdminClient } from "@/utils/supabase/admin";
import { LimitedJsonBodyError, readJsonBodyWithLimit } from "@/lib/limited-json-body";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Global circuit breaker per application instance, not per visitor/IP.
    if (!checkRateLimit("contact:global", 30, 10 * 60_000).allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }

    const body = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
    const parsed = contactOrCustomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data tidak valid",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, email, message } = parsed.data;
    const company = "company" in parsed.data ? parsed.data.company || null : null;
    const industry = "industry" in parsed.data ? parsed.data.industry : null;
    const category = "category" in parsed.data ? parsed.data.category : "general";
    const productName = "productName" in parsed.data ? (parsed.data.productName ?? null) : null;
    const productSlug = "productSlug" in parsed.data ? (parsed.data.productSlug ?? null) : null;

    const { error } = await createAdminClient().from("contact_messages").insert({
      full_name: fullName,
      email,
      company,
      industry,
      message,
      category,
      product_name: productName,
      product_slug: productSlug,
    });

    if (error) {
      console.error("[api/contact] contact.insert_failed", {
        code: /^[A-Z0-9]{5,8}$/.test(error.code ?? "") ? error.code : "unknown",
      });
      return NextResponse.json(
        { success: false, message: "Terjadi kesalahan server" },
        { status: 500 }
      );
    }

    const isCustom = category === "custom_request";

    return NextResponse.json(
      {
        success: true,
        message: isCustom
          ? "Permintaan custom telah diterima. Tim kami akan menghubungi Anda untuk membahas spesifikasi."
          : "Pertanyaan Anda telah diterima. Tim kami akan segera menghubungi Anda.",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof LimitedJsonBodyError) {
      return NextResponse.json(
        { success: false, message: error.reason === "too_large" ? "Permintaan terlalu besar." : "Format JSON tidak valid." },
        { status: error.reason === "too_large" ? 413 : 400 },
      );
    }
    console.error("[api/contact] contact.unexpected_error");
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
