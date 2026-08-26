"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import RfqModal from "./RfqModal";

interface RfqButtonProps {
  productId: string;
  productName: string;
}

export default function RfqButton({ productId, productName }: RfqButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        id="rfq-cta"
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
      >
        <ClipboardList size={16} />
        Minta Penawaran Resmi (RFQ)
      </button>

      <RfqModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={productId}
        productName={productName}
      />
    </>
  );
}
