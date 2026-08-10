"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
import { updateStock } from "@/lib/actions/store";
import { useToast } from "@/components/admin/Toast";

export default function StockEditor({ productId, initial }: { productId: string; initial: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  const apply = async (next: number) => {
    if (next < 0) return;
    setValue(next);
    setBusy(true);
    const result = await updateStock(productId, { stock: next });
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={() => apply(Math.max(0, value - 1))}
        disabled={busy}
        className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        aria-label="Kurangi stok"
      >
        <Minus size={13} />
      </button>
      <div className="relative w-16">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onBlur={(e) => apply(Number(e.target.value))}
          disabled={busy}
          className="w-full text-center text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 disabled:opacity-50"
        />
        {busy && (
          <Loader2 size={12} className="absolute right-1.5 top-2 animate-spin text-[#0EA5A0]" />
        )}
      </div>
      <button
        onClick={() => apply(value + 1)}
        disabled={busy}
        className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        aria-label="Tambah stok"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}