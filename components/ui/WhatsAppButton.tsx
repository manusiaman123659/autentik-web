"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  number: string | null;
  label?: string;
  message?: string;
  variant?: "link" | "button";
  className?: string;
  id?: string;
}

function buildHref(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export default function WhatsAppButton({
  number,
  label = "Hubungi via WhatsApp",
  message,
  variant = "button",
  className,
  id,
}: WhatsAppButtonProps) {
  if (number) {
    return (
      <a
        href={buildHref(number, message)}
        target="_blank"
        rel="noopener noreferrer"
        id={id}
        className={cn(
          variant === "button"
            ? "inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
            : "inline-flex items-center gap-1.5 font-semibold text-[#0EA5A0] hover:underline transition-colors",
          className
        )}
        style={variant === "button" ? { backgroundColor: "#25D366" } : undefined}
      >
        <MessageCircle size={16} className="flex-shrink-0" />
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      id={id}
      className={cn(
        variant === "button"
          ? "inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all"
          : "inline-flex items-center gap-1.5 font-semibold text-[#0EA5A0]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      style={variant === "button" ? { backgroundColor: "#25D366" } : undefined}
    >
      <MessageCircle size={16} className="flex-shrink-0" />
      {label}
    </button>
  );
}