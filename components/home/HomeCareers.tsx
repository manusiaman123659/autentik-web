"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

export default function HomeCareers() {
  return (
    <section className="py-24 px-8 lg:px-16" id="careers" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto">
        <AnimatedElement type="fade-up" className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-0.5 w-6 bg-[#0EA5A0]" />
              <h4
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                KARIR
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
              Bergabung Bersama Kami
            </h2>
          </div>
          <p
            className="max-w-md text-base leading-relaxed font-light"
            style={{ color: "var(--text-secondary)" }}
          >
            Kami membuka kesempatan bagi <b className="font-bold text-[#0EA5A0]">talenta terbaik</b> untuk bergabung dalam <b className="font-bold text-[#0EA5A0]">tim profesional</b> kami dan berkontribusi dalam <b className="font-bold text-[#0EA5A0]">kemajuan teknologi</b>.
          </p>
        </AnimatedElement>

        <div className="space-y-24 relative">
          {/* Item 01 */}
          <AnimatedElement type="fade-up" className="relative flex flex-col md:flex-row items-center gap-12">
            <div
              className="w-full md:w-[60%] h-[380px] relative rounded-3xl overflow-hidden z-20 shadow-lg border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80')",
                }}
              />
            </div>
            <div
              className="w-full md:w-[45%] p-8 md:p-10 rounded-3xl shadow-2xl z-30 md:-ml-20 border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="text-xs font-bold tracking-widest text-[#0EA5A0] uppercase mb-3">
                Engineering
              </p>
              <h3
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Hardware Engineer
              </h3>
              <p
                className="text-sm mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                Office (FULL TIME)
              </p>
              <Link
                href="/news/hardware-engineer"
                className="text-sm font-bold flex items-center text-[#0EA5A0] hover:gap-3 transition-all duration-200"
              >
                Lihat Detail
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
            <div className="absolute -right-6 -top-16 text-[180px] font-extrabold opacity-10 z-0 hidden md:block select-none pointer-events-none leading-none" style={{ color: "var(--text-primary)" }}>
              01
            </div>
          </AnimatedElement>

          {/* Item 02 */}
          <AnimatedElement type="fade-up" className="relative flex flex-col md:flex-row-reverse items-center gap-12">
            <div
              className="w-full md:w-[60%] h-[380px] relative rounded-3xl overflow-hidden z-20 shadow-lg border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80')",
                }}
              />
            </div>
            <div
              className="w-full md:w-[45%] p-8 md:p-10 rounded-3xl shadow-2xl z-30 md:-mr-20 border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="text-xs font-bold tracking-widest text-[#0EA5A0] uppercase mb-3">
                Procurement
              </p>
              <h3
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                PPIC & Procurement
              </h3>
              <p
                className="text-sm mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                Office (FULL TIME)
              </p>
              <Link
                href="/news/ppic-and-procurement"
                className="text-sm font-bold flex items-center text-[#0EA5A0] hover:gap-3 transition-all duration-200"
              >
                Lihat Detail
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
            <div className="absolute left-0 -top-16 text-[180px] font-extrabold opacity-10 z-0 hidden md:block select-none pointer-events-none leading-none" style={{ color: "var(--text-primary)" }}>
              02
            </div>
          </AnimatedElement>

          {/* View All Positions Button */}
          <div className="text-center pt-8">
            <Link
              href="/news"
              className="inline-flex items-center justify-center rounded-full font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] h-12 px-8 text-base shadow-xl transition-all hover:scale-105"
            >
              LIHAT SEMUA POSISI
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
