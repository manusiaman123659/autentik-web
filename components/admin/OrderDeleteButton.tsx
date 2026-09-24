"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOrder } from "@/lib/actions/store";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function OrderDeleteButton({
  orderId,
  orderCode,
  disabled = false,
}: {
  orderId: string;
  orderCode: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    const result = await deleteOrder(orderId);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setOpen(false);
    if (result.success) {
      router.push("/admin/orders");
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Selesaikan rekonsiliasi pembayaran sebelum mengarsipkan pesanan." : undefined}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={15} />
        Hapus Pesanan
      </button>
      {open && (
        <ConfirmDialog
          title={`Hapus pesanan ${orderCode}?`}
          description="Pesanan akan dihapus permanen beserta item-nya. Hanya pesanan berstatus Dibatalkan yang bisa dihapus."
          confirmLabel="Hapus Permanen"
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
          busy={busy}
        />
      )}
    </>
  );
}
