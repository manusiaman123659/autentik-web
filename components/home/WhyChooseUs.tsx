"use client";

import { LayoutGrid, Wifi, Shield, Clock } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

export default function WhyChooseUs() {
  return (
    <section className="py-24 px-8 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left Column */}
        <AnimatedElement type="fade-up" className="flex flex-col justify-between">
          <div>
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-0.5 w-6 bg-[#0EA5A0]" />
                <h4
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "var(--text-secondary)" }}
                >
                  KEUNGGULAN KAMI
                </h4>
              </div>
              <h2
                className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
                style={{ color: "var(--text-primary)" }}
              >
                Dibangun untuk <br />
                Keandalan <br />
                dalam <span className="text-[#0EA5A0]">Skala</span>
              </h2>
            </div>
            <p
              className="text-lg mb-12 leading-relaxed max-w-md font-light"
              style={{ color: "var(--text-secondary)" }}
            >
              Misi kami adalah memberikan solusi teknologi pintar yang inovatif dengan fokus pada keberlanjutan dan kepuasan pelanggan.
            </p>
          </div>

          {/* Core Methodology Card */}
          <div
            className="rounded-3xl p-8 border shadow-lg relative overflow-hidden w-full lg:w-4/5"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0EA5A0]/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0" />
            <div className="mb-4 flex items-center space-x-3 gap-2 relative z-10">
              <LayoutGrid size={28} className="text-[#0EA5A0] mb-2" />
            </div>
            <div className="relative z-10">
              <h3
                className="font-bold text-xl mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Metodologi Inti
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Kami menemukan titik keseimbangan antara efisiensi, dinamika proses, dan implementasi yang tepat sasaran.
              </p>
            </div>
          </div>
        </AnimatedElement>

        {/* Right Column Grid */}
        <AnimatedElement type="fade-up" className="flex flex-col gap-6">
          {/* Top Banner Card */}
          <div
            className="rounded-3xl p-10 shadow-xl relative overflow-hidden h-64 flex flex-col justify-end text-white"
            style={{
              background:
                "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
            }}
          >
            <div className="absolute top-10 left-10 text-[#8ab4f8]">
              <Wifi size={36} />
            </div>
            <h3 className="text-2xl font-bold mb-3">Teknologi Terkini</h3>
            <p className="text-white/70 font-light leading-relaxed max-w-sm">
              Solusi berbasis teknologi pintar terdepan dari brand-brand global terpercaya.
            </p>
          </div>

          {/* 2 Small Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-3xl p-8 border shadow-md h-64 flex flex-col justify-center"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <Shield size={32} className="text-[#0EA5A0] mb-6" />
              <h3
                className="font-bold text-lg mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Kualitas Terjamin
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Produk dan layanan berkualitas prima dengan standar ISO 9001:2015.
              </p>
            </div>

            <div
              className="rounded-3xl p-8 border shadow-md h-64 flex flex-col justify-center"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <Clock size={32} className="text-[#0EA5A0] mb-6" />
              <h3
                className="font-bold text-lg mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Layanan Responsif
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Tim ahli yang siap memberikan dukungan teknis dan konsultasi profesional.
              </p>
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}
