import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Daftar — Autentik Store",
  description: "Buat akun Autentik Store baru.",
};

export default function CustomerRegisterPage() {
  return (
    <div className="rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-white/10">
      <div className="px-8 pt-8 pb-6 text-center">
        <h1 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">
          Buat Akun Baru
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sudah punya akun?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-[#0EA5A0] hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>

      <div className="px-8 pb-8">
        <RegisterForm />
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
