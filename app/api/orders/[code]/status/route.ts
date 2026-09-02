import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const TERMINAL_STATUSES = ["paid", "completed", "failed"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let destroyed = false;

      const send = (data: Record<string, unknown>) => {
        if (destroyed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          destroyed = true;
          cleanup();
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
          const cookieStore = await cookies();
          const supabase = createClient(cookieStore);
          const { data } = await supabase
            .from("orders")
            .select("payment_status, status, paid_at")
            .eq("order_code", code)
            .is("deleted_at", null)
            .single();

          if (data) {
            send(data);
            if (TERMINAL_STATUSES.includes(data.payment_status)) {
              destroyed = true;
              cleanup();
              try {
                controller.close();
              } catch {
                // already closed
              }
            }
          }
        } catch {
          // silent — keep connection open for next poll
        }
      };

      const interval = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);

      // First poll immediately
      void poll();

      function cleanup() {
        clearInterval(interval);
        clearInterval(heartbeat);
      }

      request.signal.addEventListener("abort", () => {
        destroyed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
