"use client";

import { AlertTriangle, RotateCcw, Mail } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
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
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-8 text-red-400">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Terjadi Kesalahan Sistem
            </h1>
            <p className="text-slate-300 text-base leading-relaxed font-light mb-4 max-w-md mx-auto">
              Maaf, terjadi kesalahan internal yang tidak terduga. Tim teknis
              kami telah mendapatkan notifikasi otomatis.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-500 mb-8 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md transition-all"
              >
                <RotateCcw size={16} />
                Muat Ulang
              </button>
              <a
                href="mailto:support@autentik.co.id?subject=Laporan%20Error%20Website"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all hover:border-[#0EA5A0] hover:text-[#14B8A6] text-white"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                <Mail size={16} />
                Hubungi Support
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
