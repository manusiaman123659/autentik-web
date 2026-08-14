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
} from "lucide-react";
import { faqItems } from "@/lib/data/faq";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const CHAT_TIMEOUT_MS = 25000;
const SUPPORT_WA_LINK = `https://wa.me/6282137384029?text=${encodeURIComponent(
  "Halo, saya ingin bertanya tentang produk/layanan Autentik."
)}`;

export default function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

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
  }, [chatMessages, chatLoading]);

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
            text: "Maaf, terjadi kendala teknis. Silakan coba lagi atau hubungi kami via WhatsApp di bawah.",
          },
        ]);
      }
    } catch {
      clearTimeout(timer);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Maaf, pertanyaan Anda tidak dapat diproses saat ini. Silakan coba beberapa saat lagi, atau hubungi kami via WhatsApp di bawah.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendChat(question);
  };

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
                <MessagesSquare size={18} className="text-[#0EA5A0]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  Pusat Bantuan
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  Asisten AI Autentik, menjawab otomatis
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
            {chatActive ? (
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
                <Bot size={16} className="text-[#0EA5A0] flex-shrink-0" />
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendChat();
                  }}
                  placeholder="Tanya soal produk atau layanan Autentik…"
                  maxLength={500}
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleSendChat()}
                disabled={chatLoading || !chatInput.trim()}
                aria-label="Kirim pesan"
                className="p-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0EA5A0" }}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              Jawaban dihasilkan otomatis oleh AI.
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
            <a
              href={SUPPORT_WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: "#25D366" }}
            >
              <Headphones size={16} />
              Hubungi via WhatsApp
            </a>
            <p className="text-center text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
              Tim kami membalas dalam 1–2 hari kerja
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
