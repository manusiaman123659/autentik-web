import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { chatSchema } from "@/lib/validations/chatSchema";
import { buildChatSystemPrompt } from "@/lib/ai/chat-prompt";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.1-flash-lite";
const SESSION_COOKIE = "autentik-chat-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_MESSAGES = 15;

const FALLBACK_REPLY =
  "Mohon maaf, layanan AI sedang sibuk. Silakan coba beberapa saat lagi, atau hubungi kami via WhatsApp.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

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

    const { message } = parsed.data;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? randomUUID();

    const supabase = createClient(cookieStore);
    const { data: allowed, error } = await supabase.rpc("track_chat_message", {
      p_session_id: sessionId,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
      p_max: RATE_LIMIT_MAX_MESSAGES,
    });

    if (error) {
      console.error("track_chat_message RPC error:", error);
    }

    const limited = !error && allowed === false;

    const reply = limited
      ? "Anda sudah mencapai batas pertanyaan untuk sesi ini. Silakan lanjutkan percakapan dengan tim kami melalui WhatsApp."
      : await askGemini(message);

    const response = NextResponse.json({
      success: true,
      reply,
      limited,
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
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

async function askGemini(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured");
    return FALLBACK_REPLY;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: buildChatSystemPrompt(),
        maxOutputTokens: 300,
        temperature: 0.2,
      },
    });

    const text = response.text?.trim();
    return text && text.length > 0 ? text : FALLBACK_REPLY;
  } catch (error) {
    console.error("Gemini generateContent error:", error);
    return FALLBACK_REPLY;
  }
}