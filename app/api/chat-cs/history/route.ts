import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SESSION_COOKIE = "autentik-chat-session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) {
      return NextResponse.json({ success: true, conversationId: null, messages: [] });
    }

    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.rpc("get_chat_history", {
      p_session_id: sessionId,
    });

    if (error) {
      console.error("get_chat_history RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Terjadi kesalahan server" },
        { status: 500 }
      );
    }

    const parsed = (data ?? null) as {
      conversation_id: string;
      status: string;
      broadcast_token: string;
      messages: ChatMessageRow[];
    } | null;

    return NextResponse.json({
      success: true,
      conversationId: parsed?.conversation_id ?? null,
      broadcastToken: parsed?.broadcast_token ?? null,
      status: parsed?.status ?? null,
      messages: parsed?.messages ?? [],
    });
  } catch (error) {
    console.error("Chat CS history error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_role: "visitor" | "staff";
  sender_name?: string | null;
  body: string;
  created_at: string;
}
