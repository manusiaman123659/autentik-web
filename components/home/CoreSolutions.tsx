"use client";

import Link from "next/link";
import {
  Cpu,
  FlaskConical,
  BarChart2,
  LayoutDashboard,
  Settings,
  Droplets,
  Headset,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedElement from "./ScrollAnimations";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Cpu,
  FlaskConical,
  BarChart2,
  LayoutDashboard,
  Settings,
  Droplets,
  Headset,
};

const coreSolutions = [
  {
    icon: "Cpu",
    title: "Pemantauan & Telemetri IoT",
    description: "Pemantauan kualitas air & emisi otomatis realtime.",
    href: "/solutions#iot-monitoring",
  },
  {
    icon: "LayoutDashboard",
    title: "Rekayasa & Furnitur Lab",
    description: "Desain kustom tata letak lab, Fume Hood & Workbench.",
    href: "/solutions#lab-engineering",
  },
  {
    icon: "Settings",
    title: "Kalibrasi & Perawatan",
    description: "Servis berkala & kalibrasi akurasi standar ISO.",
    href: "/solutions#calibration",
  },
  {
    icon: "Droplets",
    title: "Pengolahan Air Industri",
    description: "Sistem air murni RO/EDI & otomasi IPAL.",
    href: "/solutions#water-treatment",
  },
  {
    icon: "BarChart2",
    title: "Platform Cloud & Analytics",
    description: "Dashboard kustomisasi & integrasi API ERP.",
    href: "/solutions#platform-integration",
  },
  {
    icon: "Headset",
    title: "Konsultasi & Audit Teknis",
    description: "Studi kelayakan & pendampingan akreditasi lab.",
    href: "/solutions#consulting",
  },
];

export default function CoreSolutions() {
  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedElement type="fade-up">
          <SectionHeading
            title="Layanan & Solusi Utama Kami"
            subtitle="Portofolio layanan penyedia produk industri berbasis kebutuhan teknologi IoT & laboratorium."
            align="center"
          />
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

