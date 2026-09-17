"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import RfqModal from "@/components/product/RfqModal";
import { cn } from "@/lib/utils";

interface HomeRfqButtonProps {
  className?: string;
  id?: string;
  label?: string;
}

export default function HomeRfqButton({
  className,
  id,
  label = "Request Quotation",
}: HomeRfqButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(true)}
        className={cn("inline-flex items-center justify-center gap-2 font-bold transition-all", className)}
      >
        <ClipboardList size={18} />
        {label}
      </button>
      <RfqModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
