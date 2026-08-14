"use client";

import { ExternalLink } from "lucide-react";

export default function ApplyRecruitmentButton({
  url,
  className = "px-6 py-3",
}: {
  url: string | null;
  className?: string;
}) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md transition-all ${className}`}
      >
        Lamar Posisi Ini
        <ExternalLink size={16} />
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled
        className={`inline-flex items-center gap-2 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed ${className}`}
      >
        Lamar Posisi Ini
      </button>
      <p className="text-[11px] text-slate-400 leading-snug text-right">
        Pendaftaran online segera hadir — cek kembali dalam waktu dekat.
      </p>
    </div>
  );
}