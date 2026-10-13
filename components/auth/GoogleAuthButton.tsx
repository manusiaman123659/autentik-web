"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getSafeCustomerRedirect } from "@/lib/auth-redirect";
import { useLocale } from "next-intl";
import { getPublicRoute, localizeHref, type PublicLocale } from "@/i18n/locales";

interface GoogleAuthButtonProps {
  mode?: "login" | "register";
  redirect?: string;
  disabled?: boolean;
}

export default function GoogleAuthButton({
  mode = "login",
  redirect,
  disabled = false,
}: GoogleAuthButtonProps) {
  const locale = useLocale() as PublicLocale;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const target = getSafeCustomerRedirect(redirect, localizeHref("/store", locale));
      const safeRedirect = getPublicRoute(target.split(/[?#]/)[0])?.prefixed ? target : localizeHref(target, locale);
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", safeRedirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        console.error("Google OAuth error:", error.message);
        setErrorMsg("Gagal menghubungkan ke Google. Silakan coba lagi.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Unexpected OAuth error:", err);
      setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const label =
    mode === "register" ? "Daftar dengan Google" : "Masuk dengan Google";

  return (
    <div className="w-full space-y-2">
      {errorMsg && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900"
        >
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={disabled || loading}
        className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin text-slate-500 dark:text-slate-400" />
            <span>Menghubungkan ke Google…</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
