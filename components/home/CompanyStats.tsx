"use client";

import { useEffect, useRef, useState } from "react";
import AnimatedElement from "./ScrollAnimations";


interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { value: 10, suffix: "+", label: "Tahun Pengalaman" },
  { value: 1000, suffix: "+", label: "Proyek Laboratorium" },
  { value: 500, suffix: "+", label: "Klien Institusi" },
  { value: 0, suffix: "Nasional", label: "Cakupan Layanan" },
];

function useCountUp(target: number, duration = 1500, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);

  return count;
}

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.value, 1500, active);

  return (
    <div
      className="rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
    >
      <div className="text-4xl font-bold mb-2" style={{ color: "#0EA5A0" }}>
        {stat.value === 0 ? (
          <span>{stat.suffix}</span>
        ) : (
          <span>
            {count.toLocaleString("id-ID")}
            {stat.suffix}
          </span>
        )}
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{stat.label}</p>
    </div>
  );
}

export default function CompanyStats() {
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <AnimatedElement type="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>
              Solusi Penyedia Produk Industri dengan Teknologi IoT
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Sejak tahun 2018 berpartisipasi nyata mendukung kemandirian industri
              (Alat Ukur) dalam negeri dengan memproduksi dan memasarkan IoT Quality
              Monitoring Devices berbasis kebutuhan industri dan teknologi IoT untuk mempercayakan
              produksi lokal berjaya di negeri sendiri.
            </p>
          </AnimatedElement>

          {/* Right: Stats Grid */}
          <AnimatedElement type="stagger" className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} active={active} />
            ))}
          </AnimatedElement>
        </div>
      </div>
    </section>
  );
}

