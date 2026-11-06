import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { publicMetadata } from "@/i18n/metadata";
import Image from "next/image";
import Link from "@/i18n/navigation";
import { cookies } from "next/headers";
import {
  ShieldCheck,
  Eye,
  Target,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import CompanyProfileViewer, {
  type ComproManifestProp,
} from "@/components/ui/CompanyProfileViewer";
import TeamCarousel from "@/components/about/TeamCarousel";
import { createClient } from "@/utils/supabase/server";
import { listPublicGroups, listPublicPartners, listPublicTeamMembers } from "@/lib/public-data";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "company.metadata" });
  return publicMetadata("/about", locale, { title: t("title"), description: t("description") });
}

const missionPoints = [
  {
    number: "01",
    key: "opportunities",
  },
  {
    number: "02",
    key: "management",
  },
  {
    number: "03",
    key: "innovation",
  },
  {
    number: "04",
    key: "service",
  },
  {
    number: "05",
    key: "partnership",
  },
];

const firstValues = [
  {
    letter: "F",
    title: "Faith in God",
  },
  {
    letter: "I",
    title: "Innovative",
  },
  {
    letter: "R",
    title: "Resilience",
  },
  {
    letter: "S",
    title: "Service",
  },
  {
    letter: "T",
    title: "Totality",
  },
];

async function getComproManifest(): Promise<ComproManifestProp | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "compro")
      .maybeSingle();
    const value = (data as { value?: Record<string, unknown> } | null)?.value;
    if (!value || typeof value !== "object") return null;
    return {
      title: typeof value.title === "string" && value.title ? value.title : undefined,
      pdfUrl:
        typeof value.pdfUrl === "string" && value.pdfUrl ? value.pdfUrl : undefined,
      pdfFilename:
        typeof value.pdfFilename === "string" && value.pdfFilename
          ? value.pdfFilename
          : undefined,
    };
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "company" });
  const common = await getTranslations({ locale, namespace: "common" });
  const messages = await loadMessages(locale);
  const [comproManifest, groups, partners, teamMembers] = await Promise.all([
    getComproManifest(),
    listPublicGroups(),
    listPublicPartners(),
    listPublicTeamMembers(),
  ]);
  return (
    <>
      {/* ─── Section 1: Hero & Sekilas Perusahaan ─── */}
      <section
        className="pt-36 pb-24 relative overflow-hidden public-page-hero"
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

        <div className="max-w-7xl mx-auto px-6 lg:px-16 relative z-10">
          {/* Hero Header */}
          <AnimatedElement type="fade-up" className="text-center mb-16">
            <div className="mb-8 w-32 h-32 mx-auto flex justify-center items-center hover:scale-105 transition-all duration-500 bg-white rounded-full p-4 shadow-2xl">
              <Image
                src="/images/logo_aka/LOGO_AKA.jpg"
                alt={common("logo")}
                width={200}
                height={200}
                className="w-24 h-24 p-1 object-contain transition-transform duration-500"
              />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-heading mb-4 leading-tight">
              {t("about.heading")}
              <br />
              <span className="text-[#0EA5A0]">{t("about.highlight")}</span>
            </h1>
            <p className="text-lg md:text-xl text-body dark:text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
              {t("about.introduction")}
            </p>
            <p className="text-sm text-slate-400 font-light">
              Smart Technology is Yours
            </p>
          </AnimatedElement>

          {/* Visi & Misi Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* VISI */}
            <AnimatedElement type="fade-up">
              <div className="p-8 md:p-10 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-base dark:border-white/10 dark:hover:bg-white/10 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-[#0EA5A0] font-black italic text-3xl">I.</span>
                    <span className="text-heading">{t("about.visionTitle")}</span>
                  </h2>
                  <p className="text-lg md:text-xl leading-relaxed font-medium text-heading mb-4">
                    {t("about.vision")}
                  </p>
                </div>
              </div>
            </AnimatedElement>

            {/* MISI */}
            <AnimatedElement type="fade-up">
              <div className="p-8 md:p-10 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-base dark:border-white/10 dark:hover:bg-white/10 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-[#0EA5A0] font-black italic text-3xl">II.</span>
                    <span className="text-heading">{t("about.missionTitle")}</span>
                  </h2>
                  <ul className="space-y-4 font-medium list-none">
                    {missionPoints.map((point) => (
                      <li key={point.number} className="relative pl-5">
                        <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-[#0EA5A0]" />
                        <span className="text-heading">{t(`about.mission.${point.key}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* Value (Falsafah Organisasi) FIRSTFIRST Section */}
      <section className="py-24 px-6 lg:px-16 overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto">
          {/* Header with Overlay Watermark */}
          <AnimatedElement type="fade-up" className="text-center mb-16">
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="text-[#0EA5A0] font-black italic text-3xl">III.</span>
              <span>{t("about.valuesTitle")}</span>
            </h2>
            <div className="text-6xl md:text-8xl font-black tracking-tight relative inline-block text-slate-200 dark:text-slate-800">
              FIRST
              <div className="absolute inset-0 text-[#0EA5A0] opacity-90">
                FIRST
              </div>
            </div>
          </AnimatedElement>

          {/* 5 Cards Grid */}
          <AnimatedElement type="stagger" className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {firstValues.map((val) => (
              <div
                key={val.letter}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] p-8 md:p-10 rounded-3xl border hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="text-6xl font-black text-slate-300 dark:text-slate-700 group-hover:text-[#0EA5A0] dark:group-hover:text-[#0EA5A0] transition-colors mb-6">
                  {val.letter}
                </div>
                <h3
                  className="text-xl md:text-2xl font-bold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {val.title}
                </h3>
                <p className="font-light leading-relaxed text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                  {t(`about.values.${val.letter}.description`)}
                </p>
              </div>
            ))}
          </AnimatedElement>
        </div>
      </section>

      {/* Kebijakan Mutu Section */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedElement type="fade-up">
            <h2
              className="text-2xl md:text-3xl font-bold mb-10 flex items-center justify-center gap-3 border-b-2 border-[#0EA5A0] pb-3"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="text-[#0EA5A0] font-black italic text-3xl">IV. </span>
              <span>{t("about.quality.title")}</span>
            </h2>
            <p className="text-lg sm:text-xl font-light leading-relaxed mb-10 max-w-3xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t.rich("about.quality.introduction", { company: chunks => <span className="font-bold" style={{ color: "var(--text-primary)" }}>{chunks}</span> })}
            </p>

            <div
              className="rounded-3xl shadow-sm border p-8 md:p-12 mb-12 text-left hover:shadow-md transition-shadow"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <ul className="space-y-6 font-medium list-none">
                <li className="relative pl-10">
                  <span className="absolute left-0 top-0.5 text-[#0EA5A0]">
                    <ShieldCheck className="w-6 h-6" />
                  </span>
                  {t.rich("about.quality.products", { strong: chunks => <span className="font-bold" style={{ color: "var(--text-primary)" }}>{chunks}</span> })}
                </li>
                <li className="relative pl-10">
                  <span className="absolute left-0 top-0.5 text-[#0EA5A0]">
                    <Eye className="w-6 h-6" />
                  </span>
                  {t.rich("about.quality.improvement", { strong: chunks => <span className="font-bold" style={{ color: "var(--text-primary)" }}>{chunks}</span> })}
                </li>
                <li className="relative pl-10">
                  <span className="absolute left-0 top-0.5 text-[#0EA5A0]">
                    <Target className="w-6 h-6" />
                  </span>
                  {t.rich("about.quality.management", { strong: chunks => <span className="font-bold" style={{ color: "var(--text-primary)" }}>{chunks}</span> })}
                </li>
              </ul>
            </div>

            {/* Director's Quote Banner */}
            <div
              className="relative p-8 md:p-10 rounded-3xl text-white shadow-xl overflow-hidden hover:scale-[1.01] transition-transform duration-500"
              style={{
                background:
                  "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
              }}
            >
              <div className="absolute -top-10 -right-10 opacity-10 text-[#0EA5A0]">
                <Sparkles size={200} />
              </div>
              <p className="font-medium italic text-lg sm:text-2xl leading-relaxed relative z-10 text-center max-w-2xl mx-auto">
                {t("about.quality.quote")}
              </p>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Section 4: Interactive Deck ─── */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto">
          <AnimatedElement type="fade-up" className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 border"
              style={{
                color: "#0EA5A0",
                backgroundColor: "rgba(14, 165, 160, 0.08)",
                borderColor: "rgba(14, 165, 160, 0.2)",
              }}
            >
              <FileText size={14} />
              {t("profile.badge")}
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("profile.title")}
            </h2>
            <p className="text-base sm:text-lg font-light max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {t("profile.description")}
            </p>
          </AnimatedElement>

          <AnimatedElement type="fade-up">
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border"
              style={{
                borderColor: "var(--border-subtle)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              }}
            >
              <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common: messages.common, navigation: messages.navigation, documents: messages.documents }}>
                <CompanyProfileViewer manifest={comproManifest} />
              </NextIntlClientProvider>
            </div>
          </AnimatedElement>

          <AnimatedElement type="fade-up">
            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">
              <p className="text-xs font-light" style={{ color: "var(--text-secondary)" }}>
                {t("profile.format")} &bull; {comproManifest?.pdfUrl ? t("profile.pdfAvailable") : t("profile.pages", { count: 40 })}
              </p>
              <Link
                href="/research-partnership"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0EA5A0] hover:underline"
              >
                {t("profile.research")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Section 5: Tim Kami ─── */}
      {teamMembers.length > 0 && (
        <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div className="max-w-6xl mx-auto">
            <AnimatedElement type="fade-up">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                  {t("team.title")}
                </h2>
                <p className="text-sm font-light max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
                  {t("team.description")}
                </p>
              </div>
            </AnimatedElement>

            <TeamCarousel members={teamMembers} labels={{ previous: t("team.previous"), next: t("team.next") }} />
          </div>
        </section>
      )}

      {/* Combined GRUP KAMI & PARTNER KAMI Section */}
      <section className="py-24 px-6 lg:px-16 text-heading bg-page-alt dark:bg-navy-900">
        <div className="max-w-7xl mx-auto">
          <AnimatedElement type="fade-up">
            <div className="flex flex-col xl:flex-row gap-16 xl:gap-12 justify-between">
              
              {/* LEFT HALF: GRUP KAMI */}
              <div className="w-full xl:w-1/2">
                <div className="text-center xl:text-left mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-heading mb-3">
                    {t("groups.title")}
                  </h2>
                  <p className="text-body dark:text-slate-300 text-sm max-w-lg mx-auto xl:mx-0">
                    {t("groups.description")}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl p-4 h-36 sm:h-40 flex flex-col items-center justify-center shadow-lg transition-transform duration-300 hover:-translate-y-1 border border-white/10"
                    >
                      {group.logoUrl ? (
                        <Image
                          src={group.logoUrl}
                          alt={group.name}
                          width={140}
                          height={70}
                          className="max-h-24 max-w-[85%] object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <span className="font-extrabold text-xl text-slate-800 tracking-wider block">
                            {group.name}
                          </span>
                          {group.legalName && (
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {group.legalName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* VERTICAL DIVIDER LINE */}
              <div className="hidden xl:block w-px bg-slate-300 dark:bg-white/15 self-stretch" />

              {/* RIGHT HALF: PARTNER KAMI */}
              <div className="w-full xl:w-1/2">
                <div className="text-center xl:text-left mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-heading mb-3">
                    {t("partners.title")}
                  </h2>
                  <p className="text-body dark:text-slate-300 text-sm max-w-lg mx-auto xl:mx-0">
                    {t("partners.description")}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="bg-white rounded-2xl p-4 h-36 sm:h-40 flex flex-col items-center justify-center shadow-lg transition-transform duration-300 hover:-translate-y-1 border border-white/10"
                    >
                      {partner.logoUrl ? (
                        <Image
                          src={partner.logoUrl}
                          alt={partner.name}
                          width={140}
                          height={70}
                          className="max-h-24 max-w-[85%] object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <span className="font-bold text-base text-slate-800 block">
                            {partner.shortName}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Section 6: Dual CTA Banner ─── */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <AnimatedElement type="stagger" className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Kolaborasi Industri */}
            <div
              className="p-8 md:p-10 rounded-2xl border hover:shadow-xl transition-all duration-300 flex flex-col"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="mb-6">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
                  <ArrowRight size={22} />
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                {t("industryCta.title")}
              </h3>
              <p className="text-sm font-light leading-relaxed mb-8 flex-1" style={{ color: "var(--text-secondary)" }}>
                {t("industryCta.description")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:opacity-90"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  {t("industryCta.sales")}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold border transition-all"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
                >
                  {t("industryCta.products")}
                </Link>
              </div>
            </div>

            {/* Card 2: Program Karir & Magang */}
            <div
              className="p-8 md:p-10 rounded-2xl border hover:shadow-xl transition-all duration-300 flex flex-col"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="mb-6">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
                  <FileText size={22} />
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                {t("careerCta.title")}
              </h3>
              <p className="text-sm font-light leading-relaxed mb-8 flex-1" style={{ color: "var(--text-secondary)" }}>
                {t("careerCta.description")}
              </p>
              <div>
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:opacity-90"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  {t("careerCta.view")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
