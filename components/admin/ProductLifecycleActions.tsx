"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import {
  archiveProduct,
  restoreArchivedProduct,
  restoreTrashedProduct,
  trashProduct,
} from "@/lib/actions/productLifecycle";
import {
  getLifecycleActionCopy,
  lifecycleActions,
  readProductLifecycle,
} from "@/lib/product-lifecycle";
import type {
  ProductLifecycleAction,
  ProductLifecycleInput,
} from "@/lib/validations/productLifecycleSchema";
import type { ProductRow } from "@/lib/admin-data";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";
import { buttonClass } from "./ui";

const mutations = {
  archive: archiveProduct,
  trash: trashProduct,
  restore_to_archive: restoreTrashedProduct,
  restore_to_draft: restoreArchivedProduct,
};

type Operation = { action: ProductLifecycleAction; input: ProductLifecycleInput };

export default function ProductLifecycleActions({
  product,
  canManage,
  canRestoreTrashed = false,
}: {
  product: ProductRow;
  canManage: boolean;
  canRestoreTrashed?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const pending = useRef(false);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");

  const lifecycle = readProductLifecycle(product);

  if (!lifecycle || lifecycle.version > 2147483646) {
    if (!canManage && !canRestoreTrashed) return null;
    return (
      <span
        className="text-xs text-amber-700 dark:text-amber-300"
        title="Skema lifecycle produk belum tersedia. Jalankan migrasi database terbaru lalu muat ulang."
      >
        Migrasi diperlukan
      </span>
    );
  }

  const actions = lifecycleActions(lifecycle.state, { canManage, canRestoreTrashed });
  if (actions.length === 0) return null;

  const choose = (action: ProductLifecycleAction) => {
    if (pending.current) return;
    if (uncertain && operation) {
      setOpen(true);
      return;
    }
    try {
      setOperation({
        action,
        input: {
          productId: product.id,
          expectedVersion: lifecycle.version,
          requestId: crypto.randomUUID(),
        },
      });
      setMessage("");
      setOpen(true);
    } catch {
      toast("error", "ID permintaan belum dapat dibuat. Silakan coba lagi.");
    }
  };

  const confirm = async () => {
    if (pending.current || !operation) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await mutations[operation.action](operation.input);
      toast(result.success ? "success" : "error", result.message);
      if (result.success) {
        setOpen(false);
        setOperation(null);
        setUncertain(false);
        setMessage("");
        router.refresh();
      } else if (
        ["conflict", "forbidden", "not_found", "invalid", "unavailable"].includes(
          result.errors?.lifecycle ?? ""
        )
      ) {
        setMessage(result.message);
        setOpen(false);
        setOperation(null);
        setUncertain(false);
        router.refresh();
      } else {
        // Pertahankan UUID/aksi/versi awal: permintaan mungkin sudah commit di server.
        setMessage(result.message);
        setUncertain(true);
      }
    } catch {
      const text =
        "Hasil tindakan belum dapat dipastikan. Ulangi permintaan yang sama untuk memeriksa hasilnya.";
      setMessage(text);
      setUncertain(true);
      toast("error", text);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const activeCopy = operation
    ? getLifecycleActionCopy(operation.action, lifecycle.productType)
    : null;

  return (
    <div className="inline-flex items-center justify-end gap-1.5 align-middle">
      {actions.map((action) => {
        const copy = getLifecycleActionCopy(action, lifecycle.productType);
        const isDangerAction = action === "trash";
        return (
          <button
            key={action}
            type="button"
            disabled={busy || uncertain}
            onClick={() => choose(action)}
            aria-label={`${copy.label} ${product.name}`}
            className={cn(
              buttonClass("secondary", "sm"),
              isDangerAction &&
                "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
            )}
          >
            {action === "archive" ? (
              <Archive size={13} aria-hidden="true" />
            ) : action === "trash" ? (
              <Trash2 size={13} aria-hidden="true" />
            ) : (
              <RotateCcw size={13} aria-hidden="true" />
            )}
            {copy.label}
          </button>
        );
      })}
      {uncertain && operation && (
        <button
          type="button"
          disabled={busy}
          className={buttonClass("secondary", "sm")}
          onClick={() => setOpen(true)}
        >
          Ulangi
        </button>
      )}
      {open && operation && activeCopy && (
        <ConfirmDialog
          title={`${activeCopy.label} "${product.name}"?`}
          description={`${activeCopy.description}${message ? ` ${message}` : ""}`}
          confirmLabel={uncertain ? "Ulangi permintaan" : activeCopy.confirmLabel}
          tone={activeCopy.tone}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => {
            if (!pending.current) setOpen(false);
          }}
        />
      )}
    </div>
  );
}
