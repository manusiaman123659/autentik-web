"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import {
  customerLoginSchema,
  type CustomerLoginFormData,
} from "@/lib/validations/authSchema";
import { createClient } from "@/utils/supabase/client";

function translateAuthError(error: { code?: string; message?: string }): string {
  if (error.code === "invalid_credentials")
    return "Email atau kata sandi salah.";
  if (error.code === "email_not_confirmed")
    return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  if (error.code === "email_not_verified")
    return "Email belum diverifikasi.";
  if (error.code === "over_email_send_rate_limit")
    return "Terlalu banyak percobaan. Silakan coba lagi beberapa saat.";
  return error.message && error.message.length > 0
    ? "Gagal masuk: " + error.message
    : "Terjadi kesalahan. Silakan coba lagi.";
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/store/checkout";
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerLoginFormData>({
    resolver: zodResolver(customerLoginSchema),
  });

  const onSubmit = async (data: CustomerLoginFormData) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        setErrorMsg(translateAuthError(error));
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          htmlFor="customer-email"
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
            id="customer-email"
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
          htmlFor="customer-password"
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
            id="customer-password"
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
            aria-label={
              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
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
  );
}
