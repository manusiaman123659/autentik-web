"use client";
import { getPublicRoute, localizeHref } from "@/i18n/locales";

import { useCallback, useState } from "react";
import { Link2, Check } from "lucide-react";

interface CopyLinkButtonProps {
  slug: string;
}

export default function CopyLinkButton({ slug }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}${localizeHref(`/store/${slug}`, getPublicRoute(window.location.pathname)?.locale ?? "id")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  }, [slug]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Tersalin!" : "Salin Link"}
      className="w-8 h-8 flex items-center justify-center rounded-sm border transition-colors"
      style={{
        borderColor: "var(--border-subtle)",
        color: copied ? "#0EA5A0" : "var(--text-muted)",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
    </button>
  );
}
