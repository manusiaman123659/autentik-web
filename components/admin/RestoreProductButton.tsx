"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { restoreProduct } from "@/lib/actions/products";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function RestoreProductButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);

  const handleConfirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      const result = await restoreProduct(id);
      toast(result.success ? "success" : "error", result.message);
      setOpen(false);
      if (result.success) router.refresh();
    } catch {
      toast("error", "Gagal memulihkan produk. Silakan coba lagi.");
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label={`Pulihkan Produk${name ? ` ${name}` : ""}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#0EA5A0]/30 text-xs font-semibold text-[#0C8C87] dark:text-teal-300 hover:bg-[#0EA5A0]/10 hover:border-[#0EA5A0]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCcw size={12} aria-hidden="true" />
        Pulihkan
      </button>
      {open && (
        <ConfirmDialog
          title={`Pulihkan ${name ? `"${name}"` : "produk ini"}?`}
          description="Status sebelum diarsipkan akan dipertahankan. Produk yang tayang dan aktif dapat kembali terlihat di halaman publik."
          confirmLabel="Pulihkan"
          tone="primary"
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
          busy={busy}
        />
      )}
    </>
  );
}
