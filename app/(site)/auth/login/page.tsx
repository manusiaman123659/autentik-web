import Link from "next/link";
import LoginForm from "./LoginForm";
import { getSafeCustomerRedirect } from "@/lib/auth-redirect";

export const metadata = {
  title: "Masuk — Autentik Store",
  description: "Masuk ke akun Autentik Store Anda.",
};

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[]; error?: string | string[] }>;
}) {
  const rawRedirect = (await searchParams).redirect;
  const redirect = typeof rawRedirect === "string"
    ? getSafeCustomerRedirect(rawRedirect)
    : undefined;
  const registerHref = redirect
    ? `/auth/register?redirect=${encodeURIComponent(redirect)}`
    : "/auth/register";

  return (
    <div className="rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-white/10">
      <div className="px-8 pt-8 pb-6 text-center">
        <h1 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">
          Masuk ke Akun Anda
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Belum punya akun?{" "}
          <Link
            href={registerHref}
            className="font-semibold text-[#0EA5A0] hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      <div className="px-8 pb-8">
        <LoginForm />
      </div>

      <div className="px-8 pb-6 text-center">
        <Link
          href="/store"
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Kembali ke Store
        </Link>
      </div>
    </div>
  );
}
