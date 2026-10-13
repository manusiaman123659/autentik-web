"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import RfqModal from "./RfqModal";

interface RfqButtonProps {
  productId: string;
  productName: string;
  displayName?: string;
  /** "default" = full-width (product detail page); "compact" = flex-1 (card grid) */
  variant?: "default" | "compact";
}

export default function RfqButton({
  productId,
  productName,
  displayName,
  variant = "default",
}: RfqButtonProps) {
  const t = useTranslations("requests.rfq");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setModalOpen(true);
        }}
        id="rfq-cta"
        className={cn(
          "inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border transition-colors",
          "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
          variant === "compact"
            ? "flex-1"
            : "w-full",
        )}
      >
        <ClipboardList size={16} />
        {t(variant === "compact" ? "triggerCompact" : "title")}
      </button>

      <RfqModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={productId}
        productName={productName}
        displayName={displayName}
      />
    </>
  );
}
