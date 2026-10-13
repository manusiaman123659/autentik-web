import Link from "next/link";
import { Compass, ArrowRight, Home } from "lucide-react";

export default function NotFoundContent({ homeHref = "/", productsHref = "/products" }: { homeHref?: string; productsHref?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex-1 flex items-center justify-center relative overflow-hidden py-24">
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
        <div
          className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #0EA5A0, transparent)" }}
        />

        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-8">
            <Compass size={14} />
            Error 404
          </div>
          <p
            className="text-7xl sm:text-8xl font-black tracking-tight text-white mb-4"
            style={{ textShadow: "0 0 40px rgba(20, 184, 166, 0.35)" }}
          >
            404
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Halaman tidak ditemukan
          </h1>
          <p className="text-slate-300 text-base leading-relaxed font-light mb-10 max-w-md mx-auto">
            Sepertinya halaman yang Anda cari sudah dipindah atau tidak pernah
            ada. Silakan kembali ke beranda atau jelajahi katalog produk kami.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md transition-all"
            >
              <Home size={18} />
              Kembali ke Home
            </Link>
            <Link
              href={productsHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all hover:border-[#0EA5A0] hover:text-[#14B8A6] text-white"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              Lihat Katalog Produk
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
