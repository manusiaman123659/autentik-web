"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Headphones,
  MessagesSquare,
  Send,
  Bot,
  Loader2,
} from "lucide-react";
import { faqItems } from "@/lib/data/faq";
import { createClient } from "@/utils/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface HistoryMessage {
  id: string;
  conversation_id: string;
  sender_role: "visitor" | "staff";
  sender_name?: string | null;
  body: string;
  created_at: string;
}

const CHAT_TIMEOUT_MS = 25000;

export default function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [csActive, setCsActive] = useState(false);
  const [csInput, setCsInput] = useState("");
  const [csMessages, setCsMessages] = useState<ChatMessage[]>([]);
  const [csConversationId, setCsConversationId] = useState<string | null>(null);
  const [csConnecting, setCsConnecting] = useState(false);
  const [csSending, setCsSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatLoading, csMessages, csSending]);

  useEffect(() => {
    if (!csConversationId || !csActive) return;
    const client = supabaseRef.current ?? createClient();
    supabaseRef.current = client;
    const channel = client
      .channel(`conversation:${csConversationId}`)
      .on("broadcast", { event: "reply" }, (payload) => {
        const p = payload as { payload?: { body?: string; sender_name?: string | null } };
        const text = p?.payload?.body;
        if (typeof text === "string" && text.trim()) {
          setCsMessages((prev) => [...prev, { role: "assistant", text }]);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel).catch(() => {});
    };
  }, [csConversationId, csActive]);

  const handleSendChat = async (message?: string) => {
    const text = (message ?? chatInput).trim();
    if (!text || chatLoading) return;

    setChatActive(true);
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (res.ok && data.success && typeof data.reply === "string") {
        setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Maaf, terjadi kendala teknis. Silakan coba lagi atau lanjutkan lewat tombol 'Chat dengan CS' di bawah.",
          },
        ]);
      }
    } catch {
      clearTimeout(timer);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Maaf, pertanyaan Anda tidak dapat diproses saat ini. Silakan coba beberapa saat lagi, atau lanjutkan lewat tombol 'Chat dengan CS' di bawah.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendChat(question);
  };

  const startCsChat = async () => {
    if (csConnecting) return;

    if (csConversationId) {
      setCsActive(true);
      return;
    }

    setCsConnecting(true);
    try {
      const startRes = await fetch("/api/chat-cs/start", { method: "POST" });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.success || !startData.conversationId) {
        setCsMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Gagal terhubung ke tim Autentik. Silakan coba beberapa saat lagi." },
        ]);
        return;
      }

      setCsConversationId(startData.conversationId);

      const historyRes = await fetch("/api/chat-cs/history", { method: "POST" });
      const historyData = await historyRes.json();
      if (historyRes.ok && historyData.success && Array.isArray(historyData.messages)) {
        const rows = historyData.messages as HistoryMessage[];
        setCsMessages(
          rows.map((m) => ({
            role: m.sender_role === "staff" ? "assistant" : "user",
            text: m.body,
          }))
        );
      }
    } catch {
      setCsMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Gagal terhubung ke tim Autentik. Silakan coba beberapa saat lagi." },
      ]);
    } finally {
      setCsConnecting(false);
      setCsActive(true);
    }
  };

  const handleSendCs = async (message?: string) => {
    const text = (message ?? csInput).trim();
    if (!text || csSending || !csConversationId) return;

    setCsInput("");
    setCsMessages((prev) => [...prev, { role: "user", text }]);
    setCsSending(true);

    try {
      const res = await fetch("/api/chat-cs/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCsMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", text: "Gagal mengirim pesan. Silakan coba lagi." },
        ]);
      }
    } catch {
      setCsMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", text: "Koneksi bermasalah, pesan tidak terkirim. Silakan coba lagi." },
      ]);
    } finally {
      setCsSending(false);
    }
  };

  const subtitle = csActive
    ? "Terhubung dengan tim Autentik"
    : "Asisten AI Autentik, menjawab otomatis";

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm sm:w-96 rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[75vh] transition-all duration-200"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          role="dialog"
          aria-label="Pusat Bantuan"
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between gap-3"
            style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0EA5A0]/15">
                {csActive ? (
                  <Headphones size={18} className="text-[#0EA5A0]" />
                ) : (
                  <MessagesSquare size={18} className="text-[#0EA5A0]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  Pusat Bantuan
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup bantuan"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1" style={{ backgroundColor: "var(--bg-card)" }}>
            {csActive ? (
              <div className="p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setCsActive(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
                >
                  <ArrowLeft size={14} />
                  Kembali ke pertanyaan cepat
                </button>

                {csMessages.length === 0 && !csSending ? (
                  <p className="text-sm leading-relaxed py-2" style={{ color: "var(--text-secondary)" }}>
                    Halo 👋 Tim Autentik akan membalas pesan Anda. Balasan staf muncul langsung di
                    percakapan ini.
                  </p>
                ) : (
                  csMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl whitespace-pre-line ${
                          m.role === "user" ? "text-white" : "border"
                        }`}
                        style={
                          m.role === "user"
                            ? { backgroundColor: "#0EA5A0" }
                            : { backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }
                        }
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
                {csSending && (
                  <div className="flex justify-end">
                    <div
                      className="px-3.5 py-2.5 text-sm rounded-2xl"
                      style={{ backgroundColor: "#0EA5A0", opacity: 0.6, color: "#fff" }}
                    >
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            ) : chatActive ? (
              <div className="p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setChatActive(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
                >
                  <ArrowLeft size={14} />
                  Kembali ke daftar pertanyaan cepat
                </button>

                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl whitespace-pre-line ${
                        m.role === "user" ? "text-white" : "border"
                      }`}
                      style={
                        m.role === "user"
                          ? { backgroundColor: "#0EA5A0" }
                          : { backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div
                      className="px-3.5 py-2.5 text-sm rounded-2xl border"
                      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
                    >
                      Mengetik…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Halo 👋 Tanyakan apa saja soal produk, layanan, atau pesanan custom Autentik.
                  Bot menjawab otomatis dalam beberapa detik.
                </div>

                {/* Quick questions */}
                <div>
                  <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    Pertanyaan populer
                  </p>
                  <div className="space-y-1">
                    {faqItems.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleQuickQuestion(f.question)}
                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <span
                          className="text-sm font-medium leading-snug group-hover:text-[#0EA5A0] transition-colors"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {f.question}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat composer */}
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5"
                style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}
              >
                {csActive ? (
                  <Headphones size={16} className="text-[#0EA5A0] flex-shrink-0" />
                ) : (
                  <Bot size={16} className="text-[#0EA5A0] flex-shrink-0" />
                )}
                <input
                  type="text"
                  value={csActive ? csInput : chatInput}
                  onChange={(e) => (csActive ? setCsInput(e.target.value) : setChatInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (csActive) handleSendCs();
                      else handleSendChat();
                    }
                  }}
                  placeholder={csActive ? "Tulis pesan untuk tim Autentik…" : "Tanya soal produk atau layanan Autentik…"}
                  maxLength={csActive ? 1000 : 500}
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => (csActive ? handleSendCs() : handleSendChat())}
                disabled={
                  csActive
                    ? csSending || !csInput.trim() || !csConversationId
                    : chatLoading || !chatInput.trim()
                }
                aria-label="Kirim pesan"
                className="p-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0EA5A0" }}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              {csActive
                ? "Pesan Anda masuk ke kotak masuk tim Autentik."
                : "Jawaban dihasilkan otomatis oleh AI."}
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
            {csActive ? (
              <button
                type="button"
                onClick={() => setCsActive(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <ArrowLeft size={16} />
                Kembali ke Asisten AI
              </button>
            ) : (
              <button
                type="button"
                onClick={startCsChat}
                disabled={csConnecting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0EA5A0" }}
              >
                {csConnecting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Headphones size={16} />
                )}
                {csConnecting ? "Menghubungkan…" : "Chat dengan CS"}
              </button>
            )}
            <p className="text-center text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
              Respon tim kami 1–2 hari kerja
            </p>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Tutup pusat bantuan" : "Buka pusat bantuan"}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
        style={{ backgroundColor: "#0EA5A0" }}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
