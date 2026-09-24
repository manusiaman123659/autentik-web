"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Hapus",
  tone = "danger",
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [localBusy, setLocalBusy] = useState(false);
  const isBusy = busy || localBusy;

  const handleConfirm = async () => {
    setLocalBusy(true);
    try {
      await onConfirm();
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative min-w-0 w-full max-w-md whitespace-normal rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 flex flex-col items-center text-center space-y-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 ${tone === "primary" ? "bg-[#0EA5A0]/10 text-[#0EA5A0]" : "bg-red-500/10 text-red-500"}`}>
          {tone === "primary" ? <RotateCcw size={24} /> : <AlertTriangle size={24} />}
        </div>
        <h3 className="max-w-full whitespace-normal text-lg font-bold text-slate-900 dark:text-white break-words">{title}</h3>
        {description && <p className="w-full max-w-sm whitespace-normal text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed break-words px-2">{description}</p>}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 ${tone === "primary" ? "bg-[#0EA5A0] hover:bg-[#0C8C87]" : "bg-red-500 hover:bg-red-600"}`}
          >
            {isBusy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
