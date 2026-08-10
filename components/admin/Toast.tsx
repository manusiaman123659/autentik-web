"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}

const STYLES: Record<ToastKind, { icon: ReactNode; ring: string; iconColor: string }> = {
  success: { icon: <CheckCircle2 size={18} />, ring: "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900", iconColor: "text-emerald-500" },
  error: { icon: <XCircle size={18} />, ring: "border-red-200 dark:border-red-800 bg-white dark:bg-slate-900", iconColor: "text-red-500" },
  info: { icon: <Info size={18} />, ring: "border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900", iconColor: "text-sky-500" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => {
          const s = STYLES[t.kind];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${s.ring}`}
              role="status"
            >
              <span className={`mt-0.5 ${s.iconColor}`}>{s.icon}</span>
              <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}