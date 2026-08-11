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
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-700 transition-colors"
      >
        <Trash2 size={13} />
        Hapus
      </button>
      {open && (
        <ConfirmDialog
          title={`Hapus ${name ? `"${name}"` : "item ini"}?`}
          description="Apakah Anda yakin? Data yang dihapus tidak dapat dipulihkan."
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
          busy={busy}
        />
      )}
    </>
  );
}