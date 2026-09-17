import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import {
  developmentCapabilities,
  registeredTrademarks,
  trademarkDocuments,
  verifiedCollaborations,
} from "@/lib/data/research-partnership";

export const metadata: Metadata = {
  title: "Research & Partnership | PT Autentik Karya Analitika",
  description:
    "Informasi kapabilitas pengembangan produk, kolaborasi yang terdokumentasi, dan merek terdaftar PT Autentik Karya Analitika.",
  alternates: { canonical: "/research-partnership" },
};

export default function ResearchPartnershipPage() {
  return (
    <main className="flex-grow">
      <section className="relative overflow-hidden bg-[#0B1F3A] px-6 pb-24 pt-36 text-white lg:px-16">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -right-20 top-8 h-80 w-80 rounded-full bg-[#0EA5A0]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <AnimatedElement type="fade-up" className="max-w-4xl">
            <div className="mb-6 flex items-center gap-3 text-[#14B8A6]">
              <Handshake size={22} />
              <span className="text-xs font-bold uppercase tracking-[0.22em]">
                Research &amp; Partnership
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Pengembangan produk melalui engineering dan kolaborasi
            </h1>
            <p className="mt-6 max-w-3xl text-base font-light leading-relaxed text-slate-300 sm:text-lg">
              AKA mengembangkan produk sebagai manufacturer dengan dukungan fungsi engineering
              internal dan kolaborasi yang terdokumentasi bersama institusi terkait.
            </p>
          </AnimatedElement>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <AnimatedElement type="fade-up">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">
              Product Development
            </p>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Kapabilitas pengembangan yang terhubung dari ide ke produk
            </h2>
            <p
              className="mt-5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Struktur organisasi AKA menempatkan fungsi R&amp;D, embedded engineering, dan
              design engineering dalam jalur pengembangan produk. Informasi ini menunjukkan
              kapabilitas internal, bukan daftar proyek atau hasil riset tertentu.
            </p>
          </AnimatedElement>

          <AnimatedElement type="stagger" className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
            {developmentCapabilities.map((capability, index) => (
              <article
                key={capability.title}
                className="grid gap-4 border-b py-7 sm:grid-cols-[72px_1fr]"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3 sm:block">
                  <span className="text-xs font-bold tracking-[0.18em] text-[#0EA5A0]">
                    0{index + 1}
                  </span>
                  <Cpu size={20} className="mt-0 text-[#0EA5A0] sm:mt-4" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {capability.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {capability.description}
                  </p>
                </div>
              </article>
            ))}
          </AnimatedElement>
        </div>
      </section>

      {verifiedCollaborations.length > 0 && (
        <section className="px-6 py-24 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <div className="mx-auto max-w-7xl">
            <AnimatedElement type="fade-up" className="mb-12 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">
                Kolaborasi Terdokumentasi
              </p>
              <h2
                className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Ruang lingkup kolaborasi pengembangan dan penerapan teknologi
              </h2>
              <p className="mt-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Informasi berikut disajikan sesuai ruang lingkup yang telah diverifikasi, tanpa
                memperluas status, periode, atau hasil kolaborasi.
              </p>
            </AnimatedElement>

            <AnimatedElement type="stagger" className="divide-y border-y" style={{ borderColor: "var(--border-subtle)" }}>
              {verifiedCollaborations.map((collaboration, index) => (
                <article
                  key={`${collaboration.organization}-${collaboration.scope}`}
                  className="grid gap-5 py-7 md:grid-cols-[64px_0.9fr_1.1fr] md:items-start"
                >
                  <span className="text-sm font-bold tracking-[0.18em] text-[#0EA5A0]">
                    0{index + 1}
                  </span>
                  <div>
                    <span className="inline-flex rounded-full bg-[#0EA5A0]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0C8C87]">
                      {collaboration.category}
                    </span>
                    <h3
                      className="mt-3 text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {collaboration.organization}
                    </h3>
                  </div>
                  <div>
                    <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {collaboration.scope}
                    </p>
                  </div>
                </article>
              ))}
            </AnimatedElement>
          </div>
        </section>
      )}

      {registeredTrademarks.length > 0 && (
        <section className="bg-[#0B1F3A] px-6 py-24 text-white lg:px-16">
          <div className="mx-auto max-w-7xl">
            <AnimatedElement type="fade-up" className="mb-12 max-w-3xl">
              <div className="mb-4 flex items-center gap-3 text-[#14B8A6]">
                <ShieldCheck size={22} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  Kekayaan Intelektual
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Merek Terdaftar</h2>
              <p className="mt-5 leading-relaxed text-slate-300">
                AKA memiliki Sertifikat Merek berikut dengan pemegang merek PT Autentik Karya
                Analitika.
              </p>
            </AnimatedElement>

            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <AnimatedElement type="stagger" className="grid grid-cols-2 border-l border-t border-white/15">
                {registeredTrademarks.map((trademark) => (
                  <article key={trademark.name} className="border-b border-r border-white/15 p-5 sm:p-6">
                    <p className="text-2xl font-black tracking-tight sm:text-3xl">{trademark.name}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#14B8A6]">
                      {trademark.category}
                    </p>
                    <div className="mt-5 text-xs text-slate-400">
                      <p>{trademark.holder}</p>
                    </div>
                  </article>
                ))}
              </AnimatedElement>

              {trademarkDocuments.length > 0 && (
                <AnimatedElement type="stagger" className="space-y-5">
                  {trademarkDocuments.map((document) => (
                    <figure key={document.imageSrc} className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                      <Image
                        src={document.imageSrc}
                        alt={document.alt}
                        width={2000}
                        height={1125}
                        className="h-auto w-full"
                      />
                      <figcaption className="px-5 py-4 text-xs text-slate-300">
                        Sertifikat Merek: {document.marks.join(" dan ")}
                      </figcaption>
                    </figure>
                  ))}
                </AnimatedElement>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <AnimatedElement type="fade-up" className="mx-auto max-w-5xl">
          <div
            className="flex flex-col items-start justify-between gap-8 rounded-2xl border p-8 md:flex-row md:items-center md:p-10"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[#0EA5A0]">
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Peluang Kolaborasi</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl" style={{ color: "var(--text-primary)" }}>
                Punya kebutuhan pengembangan yang ingin didiskusikan?
              </h2>
              <p className="mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Sampaikan konteks dan ruang lingkup awal melalui kanal kontak resmi AKA.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#0EA5A0] px-6 text-sm font-bold text-white transition-colors hover:bg-[#0C8C87]"
            >
              Diskusikan Kolaborasi
              <ArrowRight size={16} />
            </Link>
          </div>
        </AnimatedElement>
      </section>
    </main>
  );
}
