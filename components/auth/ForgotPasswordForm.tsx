"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "@/i18n/navigation";
import { z } from "zod";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

type ForgotPasswordValues = {
  email: string;
};

export default function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const [submitting, setSubmitting] = useState(false);
  const [neutral, setNeutral] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t("errors.emailRequired"))
          .max(254, t("errors.emailInvalid"))
          .email(t("errors.emailInvalid")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/customer/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        setNeutral(true);
        return;
      }

      if (response.status === 429) {
        setErrorMsg(t("errors.rateLimited"));
      } else if (response.status === 503) {
        setErrorMsg(t("errors.unavailable"));
      } else if (response.status === 400) {
        setErrorMsg(t("errors.emailInvalid"));
      } else {
        setErrorMsg(t("errors.generic"));
      }
    } catch {
      setErrorMsg(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  if (neutral) {
    return (
      <div role="status" className="space-y-5">
        <div className="px-4 py-4 rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-[#0EA5A0]/10 border border-[#0EA5A0]/25">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#0EA5A0]" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {t("neutralTitle")}
              </p>
              <p className="mt-1 leading-relaxed">{t("neutralBody")}</p>
            </div>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: "#0EA5A0" }}
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
          htmlFor="forgot-email"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          {t("emailLabel")}
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            disabled={submitting}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 ${
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#0EA5A0" }}
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </button>

      <div className="text-center">
        <Link
          href="/auth/login"
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </form>
  );
}
