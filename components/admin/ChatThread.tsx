"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  sendStaffReply,
  markConversationRead,
  setConversationStatus,
  type ChatMessageRow,
} from "@/lib/actions/chat";
import { useToast } from "@/components/admin/Toast";
import { Badge, formatDateTime } from "@/components/admin/ui";

interface Props {
  conversationId: string;
  initialMessages: ChatMessageRow[];
  initialStatus: "open" | "resolved";
}

export default function ChatThread({ conversationId, initialMessages, initialStatus }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [status, setStatus] = useState<"open" | "resolved">(initialStatus);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const statusValue = (payload.new as { status?: string }).status;
          if (statusValue === "open" || statusValue === "resolved") {
            setStatus(statusValue);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [conversationId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");
    const result = await sendStaffReply(conversationId, text);
    setSending(false);

    if (result.success && result.data) {
      setMessages((prev) => (prev.some((m) => m.id === result.data!.id) ? prev : [...prev, result.data!]));
      setStatus("open");
    } else {
      setInput(text);
      toast("error", result.message);
    }
  };

  const handleToggleStatus = async () => {
    setBusyStatus(true);
    const next = status === "open" ? "resolved" : "open";
    const result = await setConversationStatus(conversationId, next);
    setBusyStatus(false);
    if (result.success) {
      setStatus(next);
      toast("success", result.message);
    } else {
      toast("error", result.message);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0EA5A0]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#0EA5A0]">V</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Visitor</p>
            <p className="text-xs text-slate-400 truncate">Percakapan {conversationId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status === "open" ? "green" : "slate"}>
            {status === "open" ? "Terbuka" : "Selesai"}
          </Badge>
          <button
            onClick={handleToggleStatus}
            disabled={busyStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {busyStatus && <Loader2 size={13} className="animate-spin" />}
            {status === "open" ? "Tandai Selesai" : "Buka Kembali"}
          </button>
        </div>
      </div>

      <div className="h-[420px] overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">
            Belum ada pesan. Tunggu visitor mengirim pesan pertamanya.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === "staff" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl whitespace-pre-line ${
                    m.sender_role === "staff"
                      ? "text-white rounded-br-md"
                      : "border bg-white dark:bg-slate-800/50 rounded-bl-md"
                  }`}
                  style={
                    m.sender_role === "staff"
                      ? { backgroundColor: "#0EA5A0" }
                      : { color: "var(--text-primary)" }
                  }
                >
                  {m.body}
                </div>
                <p className="text-[10px] mt-1 text-slate-400">
                  {m.sender_role === "staff"
                    ? (m.sender_name ?? "Staf")
                    : "Visitor"}{" "}
                  · {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Tulis balasan untuk visitor…"
            maxLength={1000}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Kirim balasan"
            className="p-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0EA5A0" }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
