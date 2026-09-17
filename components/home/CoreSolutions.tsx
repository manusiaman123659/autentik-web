"use client";

import Link from "next/link";
import { Cpu, FlaskConical, BarChart2, Droplets, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedElement from "./ScrollAnimations";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Cpu,
  FlaskConical,
  BarChart2,
  Droplets,
};

const coreSolutions = [
  {
    icon: "Cpu",
    title: "Pengembangan IoT & Monitoring",
    description: "Pengembangan perangkat dan sistem untuk pemantauan parameter operasional secara terhubung.",
    href: "/services#iot-monitoring",
  },
  {
    icon: "FlaskConical",
    title: "Produk & Sistem Laboratorium",
    description: "Pengembangan produk pendukung aktivitas laboratorium dan kebutuhan ruang kerja teknis.",
    href: "/services#lab-engineering",
  },
  {
    icon: "Droplets",
    title: "Sistem Pengolahan Air",
    description: "Pengembangan produk dan sistem terkait pemurnian serta pengolahan air.",
    href: "/services#water-treatment",
  },
  {
    icon: "BarChart2",
    title: "Platform & Integrasi Data",
    description: "Integrasi data perangkat ke dashboard dan platform untuk mendukung pemantauan terpusat.",
    href: "/services#platform-integration",
  },
];

export default function CoreSolutions() {
  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedElement type="fade-up">
          <SectionHeading
            title="Kapabilitas Pengembangan Produk"
            subtitle="Pendekatan rekayasa yang menghubungkan perangkat, sistem, dan data untuk kebutuhan operasional."
            align="center"
          />
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {coreSolutions.map((solution) => {
            const Icon = iconMap[solution.icon];
            return (
              <div
                key={solution.title}
                className="rounded-xl p-6 border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group hover:border-[#14B8A6]/40"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
              >
                {/* Icon container */}
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 bg-[#14B8A6]/10 border border-[#14B8A6]/20">
                  <Icon size={22} className="text-[#14B8A6]" />
                </div>

                <h3 className="text-base font-bold mb-2 group-hover:text-[#14B8A6] transition-colors" style={{ color: "var(--text-primary)" }}>
                  {solution.title}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  {solution.description}
                </p>

                <Link
                  href={solution.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#14B8A6] hover:text-[#0D9E98] hover:gap-2 transition-all duration-200"
                >
                  Pelajari Lebih Lanjut
                  <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </AnimatedElement>
      </div>
    </section>
  );
}

