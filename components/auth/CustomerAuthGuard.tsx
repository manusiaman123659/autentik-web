"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "@/i18n/navigation";
import { Loader2, Lock, LogIn } from "lucide-react";
import { getSafeCustomerRedirect } from "@/lib/auth-redirect";
import { createClient } from "@/utils/supabase/client";

export default function CustomerAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setIsSignedIn(Boolean(data.session));
        setLoading(false);
      }
    };
    checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsSignedIn(Boolean(session));
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="mx-auto animate-spin text-[#0EA5A0]" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Memeriksa sesi login...
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    const currentPath = getSafeCustomerRedirect(`${pathname}${search.size ? `?${search}` : ""}`);

    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center py-16 px-6 rounded-2xl border shadow-sm max-w-md w-full" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(14,165,160,0.12)" }}>
            <Lock size={28} className="text-[#0EA5A0]" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Login Diperlukan
          </h3>
          <p className="text-xs mt-1 font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Anda harus masuk terlebih dahulu untuk melanjutkan checkout.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={`/auth/login?redirect=${encodeURIComponent(currentPath)}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
            >
              <LogIn size={16} />
              Masuk
            </Link>
            <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
              Belum punya akun?{" "}
              <Link
                href={`/auth/register?redirect=${encodeURIComponent(currentPath)}`}
                className="font-semibold text-[#0EA5A0] hover:underline"
              >
                Daftar di sini
              </Link>
            </p>
            <Link
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              Kembali ke Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
