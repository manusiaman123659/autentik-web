"use client";

import { useCallback, useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareProductButtonProps {
  slug: string;
  name: string;
}

export default function ShareProductButton({ slug, name }: ShareProductButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/store/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} — Autentik`, url });
        return;
      } catch {
        // User cancelled or share failed — fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  }, [slug, name]);

  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? "Tersalin!" : "Bagikan"}
      className="w-8 h-8 flex items-center justify-center rounded-sm border transition-colors"
      style={{
        borderColor: "var(--border-subtle)",
        color: copied ? "#0EA5A0" : "var(--text-muted)",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
    </button>
  );
}
