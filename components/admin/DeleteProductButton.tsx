"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions/products";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function DeleteProductButton({
  id,
  name,
  redirectTo,
}: {
  id: string;
  name?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    const result = await deleteProduct(id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setOpen(false);
    if (result.success) {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 hover:underline transition-colors"
      >
        <Trash2 size={13} />
        Hapus
      </button>
      {open && (
        <ConfirmDialog
          title={`Hapus ${name ? `"${name}"` : "produk ini"}?`}
          description="Produk akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan."
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
          busy={busy}
        />
      )}
    </>
  );
}