import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SESSION_COOKIE = "autentik-chat-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? randomUUID();

    const supabase = createClient(cookieStore);
    const { data: conversationId, error } = await supabase.rpc("start_chat_conversation", {
      p_session_id: sessionId,
    });

    if (error || !conversationId) {
      console.error("start_chat_conversation RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Terjadi kesalahan server" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true, conversationId });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Chat CS start error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
