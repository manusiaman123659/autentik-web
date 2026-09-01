"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Truck } from "lucide-react";
import type { OrderRow, OrderItemRow } from "@/lib/admin-data";
import PrintInvoiceDocument from "./PrintInvoiceDocument";
import PrintPackingSlip from "./PrintPackingSlip";

interface Props {
  order: OrderRow;
  items: OrderItemRow[];
  companyContact: {
    address: string;
    email: string;
    phone: string;
    mapsQuery: string;
    mapEmbed: string;
  } | null;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
}

const PACKING_SLIP_STATUSES = ["processing", "shipped"];

export default function OrderPrintActions({ order, items, companyContact, bankAccount }: Props) {
  const [mode, setMode] = useState<"invoice" | "packing" | null>(null);

  const showPacking = PACKING_SLIP_STATUSES.includes(order.status);

  const handlePrint = (printMode: "invoice" | "packing") => {
    setMode(printMode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setMode(null), 500);
    }, 100);
  };

  return (
    <>
      {mode === "invoice" && createPortal(
        <PrintInvoiceDocument order={order} items={items} bankAccount={bankAccount} />,
        document.body,
      )}
      {mode === "packing" && createPortal(
        <PrintPackingSlip order={order} items={items} companyContact={companyContact} />,
        document.body,
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handlePrint("invoice")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <FileText size={14} />
          Cetak Invoice
        </button>
        {showPacking && (
          <button
            type="button"
            onClick={() => handlePrint("packing")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Truck size={14} />
            Cetak Surat Jalan
          </button>
        )}
      </div>
    </>
  );
}
