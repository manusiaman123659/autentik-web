"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Eye, EyeOff, User, Phone } from "lucide-react";
import {
  customerRegisterSchema,
  type CustomerRegisterFormData,
  validateRegister,
} from "@/lib/validations/authSchema";
import { createClient } from "@/utils/supabase/client";

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerRegisterFormData>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    },
  });

  const onSubmit = async (data: CustomerRegisterFormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateRegister(data);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
        },
      });

      if (signUpError) {
        if (signUpError.code === "user_already_exists") {
          setErrorMsg("Email sudah terdaftar. Silakan masuk.");
        } else if (signUpError.message.includes("rate")) {
          setErrorMsg("Terlalu banyak percobaan. Silakan coba lagi beberapa saat.");
        } else {
          setErrorMsg(signUpError.message || "Gagal mendaftar. Silakan coba lagi.");
        }
        return;
      }

      if (authData.user) {
        await supabase.auth.signOut();

        setSuccessMsg(
          "Registrasi berhasil! Silakan masuk dengan akun yang baru dibuat."
        );
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900"
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900"
        >
          {successMsg}
        </div>
      )}

      <div>
        <label
          htmlFor="reg-fullname"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          Nama Lengkap
        </label>
        <div className="relative">
          <User
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="reg-fullname"
            type="text"
            autoComplete="name"
            placeholder="Nama Anda"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              errors.fullName
                ? "border-red-400 dark:border-red-500"
                : "border-slate-200 dark:border-slate-700"
            }`}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && (
          <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="reg-email"
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
            id="reg-email"
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
          htmlFor="reg-phone"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          No. HP / WhatsApp{" "}
          <span className="text-slate-400 dark:text-slate-500 font-normal">
            (opsional)
          </span>
        </label>
        <div className="relative">
          <Phone
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-200 dark:border-slate-700"
            {...register("phone")}
          />
        </div>
        {errors.phone && (
          <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="reg-password"
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
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimal 6 karakter"
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

      <div>
        <label
          htmlFor="reg-confirm-password"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          Konfirmasi Kata Sandi
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="reg-confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              errors.confirmPassword
                ? "border-red-400 dark:border-red-500"
                : "border-slate-200 dark:border-slate-700"
            }`}
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-red-500 text-xs mt-1">
            {errors.confirmPassword.message}
          </p>
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
          "Daftar"
        )}
      </button>
    </form>
  );
}
