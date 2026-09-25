import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { chatSchema } from "@/lib/validations/chatSchema";
import { buildChatSystemPrompt } from "@/lib/ai/chat-prompt";
import { createClient } from "@/utils/supabase/server";
import { LimitedJsonBodyError, readJsonBodyWithLimit } from "@/lib/limited-json-body";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.1-flash-lite";
const SESSION_COOKIE = "autentik-chat-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_MESSAGES = 15;
const MAX_BODY_BYTES = 4 * 1024;

const FALLBACK_REPLY =
  "Mohon maaf, layanan AI sedang sibuk. Silakan coba beberapa saat lagi, atau hubungi kami via WhatsApp.";

export async function POST(request: NextRequest) {
  try {
    // Global circuit breakers per application instance, not per visitor/IP.
    const minute = checkRateLimit("chat:global:minute", 10, 60_000);
    if (!minute.allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    if (!checkRateLimit("chat:global:hour", 60, 60 * 60_000).allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const body = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
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
    let tracking;
    try {
      tracking = await supabase.rpc("track_chat_message", {
        p_session_id: sessionId,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
        p_max: RATE_LIMIT_MAX_MESSAGES,
      });
    } catch {
      console.error("[api/chat] chat.limiter_unavailable", { code: "request_failed" });
      return NextResponse.json(
        { success: false, message: "Layanan bantuan sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }
    const { data: allowed, error } = tracking;

    if (error) {
      console.error("[api/chat] chat.limiter_unavailable", {
        code: /^[A-Z0-9]{5,8}$/.test(error.code ?? "") ? error.code : "unknown",
      });
      return NextResponse.json(
        { success: false, message: "Layanan bantuan sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }

    if (allowed !== true && allowed !== false) {
      console.error("[api/chat] chat.limiter_unavailable", { code: "invalid_response" });
      return NextResponse.json(
        { success: false, message: "Layanan bantuan sementara tidak tersedia. Silakan coba lagi nanti." },
        { status: 503 },
      );
    }

    const limited = allowed === false;

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
    if (error instanceof LimitedJsonBodyError) {
      return NextResponse.json(
        { success: false, message: error.reason === "too_large" ? "Permintaan terlalu besar." : "Format JSON tidak valid." },
        { status: error.reason === "too_large" ? 413 : 400 },
      );
    }
    console.error("[api/chat] chat.unexpected_error");
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
    console.error("[api/chat] chat.provider_unavailable", {
      category: error instanceof Error && ["Error", "TypeError", "TimeoutError"].includes(error.name)
        ? error.name
        : "unknown",
    });
    return FALLBACK_REPLY;
  }
}
