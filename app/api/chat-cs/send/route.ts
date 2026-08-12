import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { csChatMessageSchema } from "@/lib/validations/csChatSchema";

export const runtime = "nodejs";

const SESSION_COOKIE = "autentik-chat-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = csChatMessageSchema.safeParse(body);

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

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Sesi chat tidak ditemukan. Muat ulang halaman." },
        { status: 400 }
      );
    }

    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.rpc("send_chat_message", {
      p_session_id: sessionId,
      p_body: parsed.data.message,
    });

    if (error) {
      console.error("send_chat_message RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Gagal mengirim pesan. Silakan coba lagi." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error("Chat CS send error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
