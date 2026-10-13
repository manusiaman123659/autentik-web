"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isPublicLocale, localizeHref } from "@/i18n/locales";
import Link from "@/i18n/navigation";
import {
  Cpu,
  LayoutDashboard,
  Settings,
  Droplets,
  BarChart2,
  Headset,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Wrench,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building2,
  PackageCheck,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedElement from "@/components/ui/ScrollAnimations";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Cpu,
  LayoutDashboard,
  Settings,
  Droplets,
  BarChart2,
  Headset,
  Wrench,
};

const serviceDetailsData = [
  {
    id: "iot-monitoring",
    category: "iot",
    icon: "Cpu",
    subtitle: "Integrasi sensor pintar & sistem peringatan dini otomatis",
  },
  {
    id: "lab-engineering",
    category: "lab",
    icon: "LayoutDashboard",
  },
  {
    id: "calibration",
    category: "maintenance",
    icon: "Settings",
  },
  {
    id: "water-treatment",
    category: "water",
    icon: "Droplets",
  },
  {
    id: "platform-integration",
    category: "iot",
    icon: "BarChart2",
  },
  {
    id: "consulting",
    category: "lab",
    icon: "Headset",
  },
];

const fulfillmentPaths = [
  {
    icon: PackageCheck,
    key: "ready",
    cta: { href: "/store" },
    tone: "#0EA5A0",
  },
  {
    icon: Wrench,
    key: "custom",
    cta: { href: "/custom-request" },
    tone: "#0B1F3A",
  },
  {
    icon: Headset,
    key: "thirdParty",
    cta: {
      href: "/contact",
      external: true,
    },
    tone: "#25D366",
  },
];

const processSteps = [
  {
    step: "01",
  },
  {
    step: "02",
  },
  {
    step: "03",
  },
  {
    step: "04",
  },
  {
    step: "05",
  },
];

const faqs = ["calibration", "system", "warranty", "survey"];

export default function ServicesClient({
  waNumber,
}: {
  waNumber: string | null;
}) {
  const t = useTranslations("services.ui");
  const current = useLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredServices =
    activeCategory === "all"
      ? serviceDetailsData
      : serviceDetailsData.filter((s) => s.category === activeCategory);

  return (
    <>
      {/* Hero Section */}
      <section
        className="py-24 relative overflow-hidden public-page-hero"
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-10 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #0EA5A0, transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up" className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles size={14} />
                {t("hero.badge")}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-heading mb-6 leading-tight">
                {t("hero.heading")}{" "}
                <span className="text-teal-700 dark:text-teal-300">{t("hero.highlight")}</span>
              </h1>
              <p className="text-body dark:text-slate-300 text-lg leading-relaxed mb-10 max-w-2xl">
                {t("hero.description")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  id="services-consult-btn"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-cyan-500/20 hover:opacity-95"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  {t("hero.contact")}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#services-list"
                  id="services-[#services-list]-btn"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-heading border border-base dark:border-white/20 bg-white/70 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 transition-all"
                >
                  {t("hero.catalogue")}
                </Link>
              </div>
            </div>

            {/* Right Badge Grid */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 border border-base dark:border-white/10 backdrop-blur-md">
                <ShieldCheck size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-heading font-bold text-base mb-1">{t("badges.standards.title")}</h4>
                <p className="text-sm text-body">{t("badges.standards.description")}</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 border border-base dark:border-white/10 backdrop-blur-md">
                <Cpu size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-heading font-bold text-base mb-1">{t("badges.iot.title")}</h4>
                <p className="text-sm text-body">{t("badges.iot.description")}</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 border border-base dark:border-white/10 backdrop-blur-md">
                <Wrench size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-heading font-bold text-base mb-1">{t("badges.technicians.title")}</h4>
                <p className="text-sm text-body">{t("badges.technicians.description")}</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-white/5 border border-base dark:border-white/10 backdrop-blur-md">
                <Clock size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-heading font-bold text-base mb-1">{t("badges.support.title")}</h4>
                <p className="text-sm text-body">{t("badges.support.description")}</p>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* Main Services List */}
      <section id="services-list" className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <SectionHeading
              title={t("catalogue.title")}
              subtitle={t("catalogue.description")}
              align="center"
            />
          </AnimatedElement>

          {/* Filter Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {["all", "iot", "lab", "maintenance", "water"].map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeCategory === category
                    ? "bg-[#0EA5A0] text-white shadow-md shadow-cyan-500/20"
                    : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
                style={
                  activeCategory !== category
                    ? { backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }
                    : {}
                }
              >
                {t(`categories.${category}`)}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <AnimatedElement type="stagger" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const IconComponent = iconMap[service.icon] || Wrench;
              return (
                <div
                  key={service.id}
                  id={service.id}
                  className="rounded-2xl p-7 border flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-[#0EA5A0]/10 border border-[#0EA5A0]/20 group-hover:bg-[#0EA5A0] group-hover:text-white transition-all duration-300">
                      <IconComponent size={26} className="text-[#0EA5A0] group-hover:text-white transition-colors" />
                    </div>

                    <h3
                      className="text-xl font-bold mb-3 group-hover:text-[#0EA5A0] transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t(`items.${service.id}.title`)}
                    </h3>
                    <p
                      className="text-sm mb-6 leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {t(`items.${service.id}.description`)}
                    </p>

                    <div className="space-y-2.5 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        {t("catalogue.features")}
                      </p>
                      {["one", "two", "three", "four"].map((key) => (
                        <div key={key} className="flex items-start gap-2.5 text-sm leading-relaxed">
                          <CheckCircle2 size={16} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                          <span style={{ color: "var(--text-primary)" }}>{t(`items.${service.id}.highlights.${key}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                      <Building2 size={13} />
                      <span className="line-clamp-1">{t(`items.${service.id}.target`)}</span>
                    </div>
                    <Link
                      href="/contact"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-[#0B1F3A] hover:bg-[#0EA5A0] transition-colors duration-200"
                    >
                      {t("catalogue.consult")}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </AnimatedElement>
        </div>
      </section>

      {/* Fulfillment Paths */}
      <section className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <SectionHeading
              title={t("fulfillment.title")}
              subtitle={t("fulfillment.description")}
              align="center"
            />
          </AnimatedElement>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {fulfillmentPaths.map((path) => {
              const Icon = path.icon;
              return (
                <AnimatedElement
                  key={path.key}
                  type="fade-up"
                  className="rounded-2xl p-7 border flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: `${path.tone}1A`, border: `1px solid ${path.tone}33` }}
                    >
                      <Icon size={26} style={{ color: path.tone }} />
                    </div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                      {t(`fulfillment.items.${path.key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                      {t(`fulfillment.items.${path.key}.description`)}
                    </p>
                    <ul className="space-y-2.5 mb-6">
                      {["one", "two", "three"].map((key) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm leading-relaxed">
                          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: path.tone }} />
                          <span style={{ color: "var(--text-primary)" }}>{t(`fulfillment.items.${path.key}.points.${key}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={
                      path.cta.external && waNumber
                        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t("fulfillment.whatsapp"))}`
                        : localizeHref(path.cta.href, locale)
                    }
                    target={path.cta.external ? "_blank" : undefined}
                    rel={path.cta.external ? "noopener noreferrer" : undefined}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: path.tone }}
                  >
                    {t(`fulfillment.items.${path.key}.cta`)}
                    <ArrowRight size={15} />
                  </a>
                </AnimatedElement>
              );
            })}
          </div>
        </div>
      </section>

      {/* Service Process Workflow */}
      <section className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <SectionHeading
              title={t("process.title")}
              subtitle={t("process.description")}
              align="center"
            />
          </AnimatedElement>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-12">
            {processSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-2xl border flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <span className="text-3xl font-extrabold text-[#0EA5A0]/40 mb-3 block">
                    {step.step}
                  </span>
                  <h4 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t(`process.steps.${step.step}.title`)}
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {t(`process.steps.${step.step}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <SectionHeading
              title={t("faq.title")}
              subtitle={t("faq.description")}
              align="center"
            />
          </AnimatedElement>

          <div className="space-y-4 mt-10">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border overflow-hidden transition-all duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`service-faq-${faq}`}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between font-bold text-base gap-4"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span>{t(`faq.items.${faq}.question`)}</span>
                    {isOpen ? (
                      <ChevronUp size={20} className="text-[#0EA5A0] flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      id={`service-faq-${faq}`}
                      className="px-6 pb-6 text-sm leading-relaxed border-t pt-4"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {t(`faq.items.${faq}.answer`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section
        className="py-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedElement type="fade-up">
            <div className="w-16 h-16 rounded-2xl bg-[#0EA5A0]/20 border border-[#0EA5A0]/40 flex items-center justify-center mx-auto mb-6">
              <Headset size={32} className="text-[#14B8A6]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white shadow-xl hover:opacity-90 transition-all"
                style={{ backgroundColor: "#0EA5A0" }}
              >
                {t("cta.contact")}
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
              >
                {t("cta.products")}
              </Link>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
