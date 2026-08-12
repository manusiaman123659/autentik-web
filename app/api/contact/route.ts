import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { contactOrCustomSchema } from "@/lib/validations/contactSchema";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.from("contact_messages").insert({
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
      console.error("Contact API insert error:", error);
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
    console.error("Contact API error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
