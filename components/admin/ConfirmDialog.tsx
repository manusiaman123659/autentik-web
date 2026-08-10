"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Hapus",
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-500 mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{description}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isBusy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}