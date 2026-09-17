"use client";

import { Share2 } from "lucide-react";

interface ShareJobButtonProps {
  title: string;
}

export default function ShareJobButton({ title }: ShareJobButtonProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link berhasil disalin!");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors hover:bg-[#0EA5A0]/5"
      style={{
        borderColor: "var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <Share2 size={14} />
      Bagikan
    </button>
  );
}
