"use client";

import { Blocks, DraftingCompass, MonitorCog } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

const developmentSteps = [
  {
    icon: DraftingCompass,
    number: "01",
    title: "Rekayasa Produk",
    description: "Perancangan produk dan sistem berdasarkan kebutuhan penggunaan.",
  },
  {
    icon: Blocks,
    number: "02",
    title: "Integrasi Sistem",
    description: "Penggabungan perangkat, kontrol, dan konektivitas dalam satu solusi.",
  },
  {
    icon: MonitorCog,
    number: "03",
    title: "Implementasi",
    description: "Penerapan produk untuk kebutuhan monitoring, laboratorium, dan lingkungan.",
  },
];

export default function AboutUs() {
  return (
    <section className="py-24 px-8 lg:px-16" id="about" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <AnimatedElement type="fade-up">
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-0.5 w-6 bg-[#0EA5A0]" />
              <h4
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                IDENTITAS MANUFAKTUR
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
              PT Autentik <br />
              <span className="text-[#0EA5A0]">Karya Analitika</span>
            </h2>
          </div>

          <p
            className="text-lg mb-12 leading-relaxed font-light"
            style={{ color: "var(--text-secondary)" }}
          >
            AKA mengembangkan produk dan sistem teknologi untuk kebutuhan industri,
            laboratorium, dan pemantauan lingkungan. Proses pengembangan memadukan
            rekayasa perangkat, integrasi IoT, serta pengolahan data agar setiap solusi
            dapat diterapkan sesuai konteks operasional penggunanya.
          </p>
        </AnimatedElement>

        <AnimatedElement type="fade-up">
          <div
            className="relative overflow-hidden rounded-3xl border p-6 sm:p-8 lg:p-10"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
          >
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0EA5A0]/10 blur-3xl" />
            <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">
              Dari kebutuhan ke implementasi
            </p>
            <div className="relative mt-7 space-y-4">
              {developmentSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4 sm:p-5"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {step.description}
                      </p>
                    </div>
                    <span className="self-start font-mono text-xs font-bold text-[#0EA5A0]/60">
                      {step.number}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}
