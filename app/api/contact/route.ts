import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { contactSchema } from "@/lib/validations/contactSchema";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

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

    const { fullName, email, company, industry, message } = parsed.data;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.from("contact_messages").insert({
      full_name: fullName,
      email,
      company,
      industry,
      message,
    });

    if (error) {
      console.error("Contact API insert error:", error);
      return NextResponse.json(
        { success: false, message: "Terjadi kesalahan server" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Pertanyaan Anda telah diterima. Tim kami akan segera menghubungi Anda.",
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
