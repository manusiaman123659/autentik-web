"use client";
import { useTranslations } from "next-intl";

import Link from "@/i18n/navigation";
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
    key: "iot",
    href: "/services#iot-monitoring",
  },
  {
    icon: "FlaskConical",
    key: "laboratory",
    href: "/services#lab-engineering",
  },
  {
    icon: "Droplets",
    key: "water",
    href: "/services#water-treatment",
  },
  {
    icon: "BarChart2",
    key: "platform",
    href: "/services#platform-integration",
  },
];

export default function CoreSolutions() {
  const t = useTranslations("home.solutions");
  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedElement type="fade-up">
          <SectionHeading
            title={t("title")}
            subtitle={t("description")}
            align="center"
          />
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {coreSolutions.map((solution) => {
            const Icon = iconMap[solution.icon];
            return (
              <div
                 key={solution.key}
                className="rounded-xl p-6 border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group hover:border-[#14B8A6]/40"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
              >
                {/* Icon container */}
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 bg-[#14B8A6]/10 border border-[#14B8A6]/20">
                  <Icon size={22} className="text-[#14B8A6]" />
                </div>

                <h3 className="text-base font-bold mb-2 group-hover:text-[#14B8A6] transition-colors" style={{ color: "var(--text-primary)" }}>
                   {t(`items.${solution.key}.title`)}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                   {t(`items.${solution.key}.description`)}
                </p>

                <Link
                  href={solution.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#14B8A6] hover:text-[#0D9E98] hover:gap-2 transition-all duration-200"
                >
                   {t("learnMore")}
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

