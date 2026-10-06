"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveRecruitmentUrl } from "@/lib/actions/recruitment";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export default function RecruitmentForm({
  initialUrl,
}: {
  initialUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [url, setUrl] = useState(initialUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveRecruitmentUrl({ url });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
        Pengaturan Lamaran
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Tautan eksternal untuk lamaran terbuka dan cadangan CTA. Detail lowongan
        mengutamakan apply_url dari Recruitment API.
      </p>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-start">
        <div>
          <label className={labelClass}>URL Pendaftaran</label>
          <input
            className={inputClass}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.url;
                return next;
              });
            }}
            placeholder="https://recruitment.tekna.id/"
          />
          <FieldError message={errors.url} />
          <p className="mt-1 text-xs text-slate-400">
            Hanya origin HTTPS recruitment.tekna.id yang diperbolehkan. Kosongkan untuk menonaktifkan tautan cadangan; URL API valid tetap digunakan.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60 sm:mt-6"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Simpan
        </button>
      </div>
    </section>
  );
}
