import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

export default function StoreTeaser() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--bg-primary)" }}>
      <AnimatedElement type="fade-up" className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center sm:p-8" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
              <Wrench size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0EA5A0]">Butuh Komponen?</p>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--text-primary)" }}>
                Marketplace Komponen
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Temukan pilihan komponen pendukung melalui kanal marketplace AKA.
              </p>
            </div>
          </div>
          <Link
            href="/store"
            id="home-store-secondary-cta"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-bold transition-colors hover:border-[#0EA5A0] hover:text-[#0EA5A0]"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Lihat Marketplace Komponen
            <ArrowRight size={16} />
          </Link>
        </div>
      </AnimatedElement>
    </section>
  );
}
