"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations/loginSchema";
import { signInAdmin } from "@/utils/supabase/client";

function translateAuthError(error: { code?: string; message?: string }): string {
  if (error.code === "invalid_credentials")
    return "Email atau kata sandi salah.";
  if (error.code === "email_not_confirmed")
    return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  if (error.code === "email_not_verified")
    return "Email belum diverifikasi.";
  if (error.code === "over_email_send_rate_limit")
    return "Terlalu banyak percobaan. Silakan coba lagi beberapa saat.";
  return (error.message && error.message.length > 0)
    ? "Gagal masuk: " + error.message
    : "Terjadi kesalahan. Silakan coba lagi.";
}

export default function LoginClient({ passwordReset = false }: { passwordReset?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { data: auth, error } = await signInAdmin(data.email, data.password, remember);
      if (error || !auth.session) {
        setErrorMsg(error ? translateAuthError(error) : "Sesi belum dapat dibuat. Silakan coba kembali.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-white/10">
          <div className="px-8 pt-8 pb-6 text-center">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(14,165,160,0.12)" }}
            >
              <ShieldCheck size={28} className="text-[#0EA5A0]" />
            </div>
            <h1 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">
              Autentik CMS
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk mengelola konten situs PT Autentik Karya Analitika.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 space-y-5">
            {passwordReset && <p role="status" className="rounded-xl border border-[#0EA5A0]/40 p-3 text-sm text-[#0EA5A0]">Kata sandi berhasil diperbarui. Silakan masuk kembali.</p>}
            {errorMsg && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    errors.email
                      ? "border-red-400 dark:border-red-500"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    errors.password
                      ? "border-red-400 dark:border-red-500"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} disabled={submitting} className="size-4 accent-[#0EA5A0]" />
                Ingat saya
              </label>
              <Link href="/admin/forgot-password" className="font-semibold text-[#0EA5A0] hover:underline">Lupa password?</Link>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ingat saya menyimpan sesi selama 30 hari bergulir. Browser tertentu dapat memulihkan sesi meskipun opsi ini tidak dipilih.</p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#0EA5A0" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memproses…
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke situs
        </Link>
      </div>
    </main>
  );
}
