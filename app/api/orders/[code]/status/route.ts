import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_STREAM_DURATION_MS = 65_000;
const TERMINAL_PAYMENT_STATUSES = new Set(["paid", "failed", "refunded"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  }

  // --- Rate limit check (per account + IP, max 10 connections/menit) ---
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = checkRateLimit(`sse:${user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { data: authorizedOrder, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("order_code", code)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (orderError || !authorizedOrder) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let destroyed = false;
      let pollTimer: ReturnType<typeof setTimeout> | undefined;

      const send = (data: Record<string, unknown>) => {
        if (destroyed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          destroyed = true;
          cleanup();
        }
      };

      const close = () => {
        if (destroyed) return;
        destroyed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const heartbeat = setInterval(() => {
        if (destroyed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          destroyed = true;
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      const poll = async () => {
        if (destroyed) return;
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("payment_status, status, paid_at")
            .eq("id", authorizedOrder.id)
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .maybeSingle();

          if (error || !data) {
            close();
            return;
          }

          send(data);
          if (TERMINAL_PAYMENT_STATUSES.has(data.payment_status)) {
            close();
            return;
          }
        } catch {
          close();
          return;
        }

        if (!destroyed) pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      };

      const lifetime = setTimeout(close, MAX_STREAM_DURATION_MS);

      // First poll immediately
      void poll();

      function cleanup() {
        if (pollTimer) clearTimeout(pollTimer);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
      }

      request.signal.addEventListener("abort", () => {
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
