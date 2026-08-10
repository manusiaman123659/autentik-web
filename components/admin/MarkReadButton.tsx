"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailOpen, Mail } from "lucide-react";
import { markMessageRead } from "@/lib/actions/settings";
import { useToast } from "@/components/admin/Toast";

export default function MarkReadButton({ id, isRead }: { id: string; isRead: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    const result = await markMessageRead(id, !isRead);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    router.refresh();
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${
        isRead
          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          : "bg-[#0EA5A0] text-white hover:bg-[#0C8C87]"
      }`}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isRead ? (
        <Mail size={14} />
      ) : (
        <MailOpen size={14} />
      )}
      {isRead ? "Tandai Belum Dibaca" : "Tandai Dibaca"}
    </button>
  );
}