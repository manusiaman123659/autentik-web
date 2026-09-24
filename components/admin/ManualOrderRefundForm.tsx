"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { inputClass, labelClass } from "@/components/admin/ui";
import { recordManualOrderRefund } from "@/lib/actions/store";

export default function ManualOrderRefundForm({
  orderId,
  orderCode,
  onRecorded,
}: {
  orderId: string;
  orderCode: string;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestConfirmation = () => {
    if (!reference.trim() && !note.trim()) {
      toast("error", "Isi referensi atau catatan pengembalian dana.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const result = await recordManualOrderRefund(orderId, { reference, note });
      toast(result.success ? "success" : "error", result.message);
      if (result.success) {
        setConfirmOpen(false);
        onRecorded();
        router.refresh();
      }
    } catch {
      toast("error", "Pengembalian dana tidak dapat dicatat. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="mb-3 flex items-start gap-2.5">
        <CircleDollarSign size={17} className="mt-0.5 shrink-0 text-[#0EA5A0]" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Catat Refund Eksternal</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Gunakan setelah dana benar-benar dikembalikan di luar sistem. Tindakan ini tidak mengirim dana atau mengubah stok.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="refund-reference" className={labelClass}>Referensi</label>
          <input
            id="refund-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={120}
            placeholder="Contoh: nomor transaksi bank"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="refund-note" className={labelClass}>Catatan</label>
          <textarea
            id="refund-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Catatan proses refund"
            className={`${inputClass} min-h-20 resize-y`}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={requestConfirmation}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C8C87] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Catat Refund Selesai
        </button>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title={`Konfirmasi refund ${orderCode}`}
          description="Pastikan dana sudah benar-benar dikembalikan kepada pelanggan melalui proses eksternal. Sistem hanya akan mencatat status refund dan jejak audit."
          confirmLabel="Ya, Catat Refund"
          tone="primary"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
          busy={busy}
        />
      )}
    </div>
  );
}
