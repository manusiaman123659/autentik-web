"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "@/i18n/navigation";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";

const RECOVERY_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const RECOVERY_HASH_PATTERN = /^#token=([a-f0-9]{64})$/;

type CustomerRecoveryValues = {
  password: string;
  confirmPassword: string;
};

type RecoveryOutcome = "success" | "partial" | "invalid" | "passwordRejected" | "unavailable" | null;
type TokenStatus = "checking" | "ready" | "invalid";

type ResetResponse = {
  success?: boolean;
  code?: string;
  passwordUpdated?: boolean | null;
  sessionsRevoked?: boolean;
  needsNewLink?: boolean;
};

export default function CustomerRecoveryForm() {
  const t = useTranslations("auth.recovery");
  const [token, setToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RecoveryOutcome>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const hash = window.location.hash;
    const match = RECOVERY_HASH_PATTERN.exec(hash);
    const nextToken = match?.[1] ?? null;
    setToken(nextToken);
    setTokenStatus(nextToken ? "ready" : "invalid");

    if (hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, t("errors.passwordMin"))
            .max(128, t("errors.passwordMax")),
          confirmPassword: z
            .string()
            .min(1, t("errors.confirmRequired"))
            .max(128, t("errors.passwordMax")),
        })
        .refine((value) => value.password === value.confirmPassword, {
          message: t("errors.mismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerRecoveryValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: CustomerRecoveryValues) => {
    if (!token || tokenStatus !== "ready" || !RECOVERY_TOKEN_PATTERN.test(token)) {
      setTokenStatus("invalid");
      return;
    }

    setErrorMsg(null);
    setOutcome(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/customer/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ResetResponse | null;

      if (
        response.ok &&
        payload?.success === true &&
        payload.passwordUpdated === true
      ) {
        setToken(null);
        setOutcome(payload.sessionsRevoked === true ? "success" : "partial");
        return;
      }

      if (payload?.code === "password_rejected") {
        setToken(null);
        setOutcome("passwordRejected");
        return;
      }

      if (response.status === 502 || payload?.code === "unavailable" || payload?.passwordUpdated === null) {
        setToken(null);
        setOutcome("unavailable");
        return;
      }

      if (payload?.code === "invalid_token") {
        setToken(null);
        setOutcome("invalid");
        return;
      }

      if (response.status === 400 && payload?.needsNewLink !== true) {
        setErrorMsg(t("errors.validation"));
        return;
      }

      if (response.status === 400 || payload?.needsNewLink === true) {
        setToken(null);
        setOutcome("invalid");
        return;
      }

      if (response.status === 429) {
        setErrorMsg(t("errors.rateLimited"));
      } else if (response.status === 503) {
        setErrorMsg(t("errors.unavailable"));
      } else {
        setErrorMsg(t("errors.generic"));
      }
    } catch {
      setErrorMsg(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenStatus === "checking") {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        {t("checking")}
      </div>
    );
  }

  if (tokenStatus === "invalid" || outcome === "invalid" || outcome === "passwordRejected") {
    const passwordRejected = outcome === "passwordRejected";
    return (
      <div className="space-y-4" role="alert">
        <div className="px-4 py-4 rounded-xl text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                {passwordRejected ? t("passwordRejectedTitle") : t("invalidTitle")}
              </p>
              <p className="mt-1 leading-relaxed">
                {passwordRejected ? t("passwordRejectedBody") : t("invalidBody")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/auth/forgot-password"
          className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: "#0EA5A0" }}
        >
          {t("requestNew")}
        </Link>
        <Link
          href="/auth/login"
          className="block text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          {t("login")}
        </Link>
      </div>
    );
  }

  if (outcome === "success" || outcome === "partial") {
    return (
      <div className="space-y-5" role="status">
        <div className="px-4 py-4 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("successTitle")}</p>
              <p className="mt-1 leading-relaxed">
                {outcome === "partial" ? t("successPartial") : t("successBody")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: "#0EA5A0" }}
        >
          {t("login")}
        </Link>
      </div>
    );
  }

  if (outcome === "unavailable") {
    return (
      <div className="space-y-4" role="alert">
        <div className="px-4 py-4 rounded-xl text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("unavailableTitle")}</p>
              <p className="mt-1 leading-relaxed">{t("unavailableBody")}</p>
            </div>
          </div>
        </div>
        <Link
          href="/auth/login"
          className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: "#0EA5A0" }}
        >
          {t("login")}
        </Link>
        <Link
          href="/auth/forgot-password"
          className="block text-center text-sm font-semibold text-[#0EA5A0] hover:underline"
        >
          {t("requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          htmlFor="customer-recovery-password"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          {t("passwordLabel")}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="customer-recovery-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            disabled={submitting}
            className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 ${
              errors.password
                ? "border-red-400 dark:border-red-500"
                : "border-slate-200 dark:border-slate-700"
            }`}
            {...register("password")}
          />
          <button
            type="button"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            onClick={() => setShowPassword((value) => !value)}
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
          htmlFor="customer-recovery-confirm"
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          {t("confirmLabel")}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            id="customer-recovery-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("confirmPlaceholder")}
            disabled={submitting}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 ${
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

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t("passwordPolicy")}
      </p>

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
          {t("login")}
        </Link>
      </div>
    </form>
  );
}
