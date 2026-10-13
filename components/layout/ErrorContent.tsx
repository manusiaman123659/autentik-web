"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalError({
  reset,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-24">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 flex items-center justify-center mb-8 text-[#14B8A6]">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Terjadi kendala teknis
        </h1>
        <p className="text-slate-300 text-base leading-relaxed font-light mb-10 max-w-md mx-auto">
          Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba lagi
          dalam beberapa saat, atau kembali ke beranda.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md transition-all"
          >
            <RotateCcw size={16} />
            Coba lagi
          </button>
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all hover:border-[#0EA5A0] hover:text-[#14B8A6] text-white"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            <Home size={16} />
            Kembali ke Home
          </Link>
        </div>
      </div>
    </div>
  );
}
