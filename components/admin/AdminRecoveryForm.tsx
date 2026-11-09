"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Card, buttonClass, inputClass, labelClass } from "@/components/admin/ui";
import { createClient } from "@/utils/supabase/client";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/passwordRecoverySchema";

export default function AdminRecoveryForm({ mode, invalidLink = false }: { mode: "request" | "reset"; invalidLink?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [valid, setValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState(invalidLink ? "Tautan pemulihan tidak valid, sudah digunakan, atau kedaluwarsa. Silakan minta tautan baru." : "");
  const [tone, setTone] = useState<"error" | "success" | "partial">("error");
  const cooling = seconds > 0;

  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooling]);

  useEffect(() => {
    if (mode !== "reset") return;
    const controller = new AbortController();
    fetch("/api/admin/auth/reset-password", { cache: "no-store", signal: controller.signal })
      .then(response => response.json()).then(result => setValid(result.valid === true))
      .catch(() => { if (!controller.signal.aborted) setValid(false); });
    return () => controller.abort();
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (mode === "request" && cooling) || (mode === "reset" && valid !== true)) return;
    const input = mode === "request" ? { email } : { password, confirmPassword };
    const parsed = mode === "request" ? forgotPasswordSchema.safeParse(input) : resetPasswordSchema.safeParse(input);
    if (!parsed.success) { setTone("error"); setMessage(parsed.error.issues[0].message); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/auth/${mode === "request" ? "forgot-password" : "reset-password"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), cache: "no-store",
      });
      const result = await response.json();
      setMessage(typeof result.message === "string" ? result.message : "Permintaan belum dapat diproses.");
      setTone(result.success === true ? "success" : "error");
      if (mode === "request" && (response.status === 202 || response.status === 429)) {
        const retry = Number(response.headers.get("Retry-After") || 60);
        setSeconds(Number.isFinite(retry) ? Math.min(900, Math.max(60, retry)) : 60);
      }
      if (mode === "reset" && result.passwordUpdated === true) {
        setValid(false);
        // Notify the shared browser client/DraftRecoveryProvider after server-side cleanup.
        await createClient().auth.signOut({ scope: "local" }).catch(() => {});
        if (result.signedOut === true) { router.replace("/admin/login?reset=success"); router.refresh(); }
        else setTone("partial");
      } else if (result.needsNewLink === true) setValid(false);
    } catch {
      setTone("error");
      setMessage("Hasil permintaan belum dapat dipastikan. Periksa koneksi; masuk ulang atau minta tautan baru jika diperlukan.");
    } finally { setBusy(false); setPassword(""); setConfirmPassword(""); }
  }

  const blocked = mode === "reset" && valid === false;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)" }}>
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="mb-6 text-center">
            <ShieldCheck size={32} className="mx-auto mb-3 text-[#0EA5A0]" aria-hidden="true" />
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{mode === "request" ? "Lupa Password Admin" : "Atur Ulang Kata Sandi"}</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{mode === "request" ? "Masukkan email akun CMS Anda untuk meminta tautan pemulihan." : "Gunakan kata sandi baru yang kuat. Setelah berhasil, Anda harus masuk kembali."}</p>
          </div>
          {message && <p role={tone === "success" ? "status" : "alert"} className={`mb-4 rounded-lg border p-3 text-sm ${tone === "success" ? "border-[#0EA5A0]/40 text-[#0EA5A0]" : "border-amber-500/50 text-amber-700 dark:text-amber-300"}`}>{message}</p>}
          {mode === "reset" && valid === null ? <p role="status" className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><Loader2 size={16} className="animate-spin" />Memeriksa sesi pemulihan…</p>
            : blocked ? <div className="space-y-3"><p className="text-sm" style={{ color: "var(--text-secondary)" }}>Form pemulihan tidak tersedia. Tautan harus valid dan akun CMS harus aktif.</p><Link href={tone === "partial" ? "/admin/login" : "/admin/forgot-password"} className={buttonClass()}>{tone === "partial" ? "Masuk ulang" : "Minta tautan baru"}</Link></div>
              : <form onSubmit={submit} className="space-y-4">
                {mode === "request" ? <div><label htmlFor="recovery-email" className={labelClass}>Email akun CMS</label><input id="recovery-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} className={inputClass} value={email} onChange={event => setEmail(event.target.value)} /></div>
                  : <><div><label htmlFor="recovery-password" className={labelClass}>Kata sandi baru</label><input id="recovery-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} className={inputClass} value={password} onChange={event => setPassword(event.target.value)} /></div><div><label htmlFor="recovery-confirm" className={labelClass}>Konfirmasi kata sandi</label><input id="recovery-confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} className={inputClass} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></div></>}
                <button type="submit" disabled={busy || cooling} className={`${buttonClass()} w-full`}>
                  {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  {busy ? "Memproses…" : cooling ? `Coba lagi dalam ${seconds} detik` : mode === "request" ? "Kirim Tautan Pemulihan" : "Simpan Kata Sandi Baru"}
                </button>
              </form>}
        </Card>
        <Link href="/admin/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-300 hover:text-white"><ArrowLeft size={15} aria-hidden="true" />Kembali ke login Admin</Link>
      </div>
    </main>
  );
}
