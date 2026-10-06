import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import MikaCompanyLogo from "@/components/careers/MikaCompanyLogo";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  CheckCircle2,
  Building2,
  Banknote,
  Users,
  GraduationCap,
  Send,
  Globe,
  CalendarDays,
  ChevronRight,
  CloudOff,
} from "lucide-react";
import { getMikaJobDetail } from "@/lib/api/mika-career";
import { getRecruitmentUrl } from "@/lib/public-data";
import { formatSalaryCompact } from "@/lib/format";
import MikaJobCard from "@/components/careers/MikaJobCard";
import ShareJobButton from "@/components/careers/ShareJobButton";
import JsonLd from "@/components/seo/JsonLd";
import { getSafeRecruitmentUrl } from "@/lib/recruitment-url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mikaResult = await getMikaJobDetail(slug);

  if (mikaResult.status === "found") {
    const mikaJob = mikaResult.job;
    return {
      title: `${mikaJob.title} — Mika Career | ${mikaJob.company.name}`,
      description:
        mikaJob.description ||
        `Lowongan kerja ${mikaJob.title} (${mikaJob.employment_type}) di ${mikaJob.company.name}, ${mikaJob.location}.`,
    };
  }

  if (mikaResult.status === "not_found") notFound();

  if (mikaResult.status === "unavailable") {
    return {
      title: "Detail Karir | Mika Career",
      description: "Informasi detail lowongan Mika Career sedang tidak dapat dimuat.",
    };
  }

  return {
    title: "Posisi Karir Tidak Ditemukan | Mika Career",
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const [mikaResult, recruitmentUrl] = await Promise.all([
    getMikaJobDetail(slug),
    getRecruitmentUrl(),
  ]);

  // The same guarded fetcher serves metadata and content. Never fall back to
  // an unverified legacy record for foreign/nonnumeric recruitment IDs.
  if (mikaResult.status !== "found") {
    if (mikaResult.status === "not_found") notFound();

      return (
        <section
          className="min-h-[70vh] px-4 pb-20 pt-32 sm:px-6 lg:px-8"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <div className="mx-auto max-w-2xl">
            <div
              className="rounded-2xl border p-8 text-center sm:p-10"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0EA5A0]/10 text-[#0EA5A0]">
                <CloudOff size={24} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Detail lowongan sementara tidak dapat dimuat
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Layanan karir sedang mengalami gangguan. Silakan kembali ke daftar lowongan dan coba lagi beberapa saat lagi.
              </p>
              <Link
                href="/careers"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0EA5A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0c8e8a]"
              >
                <ArrowLeft size={16} />
                Kembali ke Daftar Lowongan
              </Link>
            </div>
          </div>
        </section>
      );
  }

  const mikaJob = mikaResult.job;

  // Mika Job JSON-LD Schema
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: mikaJob.title,
    description: mikaJob.description || mikaJob.title,
    datePosted: mikaJob.created_at,
    validThrough: mikaJob.deadline,
    employmentType: mikaJob.employment_type.toUpperCase().replace("-", "_"),
    hiringOrganization: {
      "@type": "Organization",
      name: mikaJob.company.name,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: mikaJob.location,
        addressCountry: "ID",
      },
    },
    baseSalary: mikaJob.salary.min
      ? {
          "@type": "MonetaryAmount",
          currency: mikaJob.salary.currency || "IDR",
          value: {
            "@type": "QuantitativeValue",
            minValue: mikaJob.salary.min,
            maxValue: mikaJob.salary.max || mikaJob.salary.min,
            unitText: "MONTH",
          },
        }
      : undefined,
  };

  const applyUrl = getSafeRecruitmentUrl(mikaJob.apply_url) || getSafeRecruitmentUrl(recruitmentUrl) || "/contact";
  const compactSalary = formatSalaryCompact(mikaJob.salary);
  const salaryDisplay = compactSalary || mikaJob.salary.formatted || "Negosiasi";
  const isExpiringSoon = mikaJob.deadline_info.days_remaining <= 7 && !mikaJob.deadline_info.is_expired;

  const deadlineFormatted = new Date(mikaJob.deadline).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <JsonLd data={jsonLdData} />

      {/* ─── Breadcrumb ─────────────────────────────────────────────────────── */}
      <section
        className="pt-28 pb-0 public-page-hero"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Jejak navigasi" className="flex flex-wrap items-center gap-1.5 text-sm [&_svg]:shrink-0 [&_span]:[overflow-wrap:anywhere]" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="hover:text-[#0EA5A0] transition-colors">Beranda</Link>
            <ChevronRight size={12} />
            <Link href="/careers" className="hover:text-[#0EA5A0] transition-colors">Lowongan</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#0EA5A0" }}>{mikaJob.title}</span>
          </nav>
        </div>
      </section>

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <section
        className="pb-16 pt-6 px-4 sm:px-6 lg:px-8"
        style={{
          background: "linear-gradient(180deg, var(--public-hero-end) 0%, var(--bg-primary) 300px)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ── Left Column (2/3) ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Hero Card: Company Info + Title + Info Grid */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="p-6 sm:p-8">
                  {/* Top Row: Logo + Company Info + Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                    {/* Company Logo */}
                    <div
                      className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <MikaCompanyLogo
                        logo={mikaJob.company.logo}
                        companyName={mikaJob.company.name}
                        size={64}
                        className="w-full h-full object-contain p-1.5"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Employment Badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md bg-[#0EA5A0]/10 text-[#14B8A6] border border-[#0EA5A0]/25">
                          {mikaJob.employment_type}
                        </span>
                      </div>

                      {/* Title */}
                      <h1
                        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {mikaJob.title}
                      </h1>

                      {/* Company + Department */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={14} className="text-[#0EA5A0]" />
                          {mikaJob.company.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase size={14} className="text-[#0EA5A0]" />
                          {mikaJob.department.name}
                        </span>
                      </div>

                      {/* Position Tag */}
                      <div className="mt-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                          style={{
                            backgroundColor: "rgba(14, 165, 160, 0.08)",
                            borderColor: "rgba(14, 165, 160, 0.25)",
                            color: "#0EA5A0",
                          }}
                        >
                          Posisi: {mikaJob.title}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0EA5A0] text-white font-bold text-sm hover:bg-[#0c8e8a] active:scale-95 transition-all"
                      >
                        <Send size={14} />
                        Masuk & Lamar
                      </a>
                      <ShareJobButton title={mikaJob.title} />
                    </div>
                  </div>

                  {/* Info Grid: 4 columns */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 [&>div]:min-w-0 [&_p]:[overflow-wrap:anywhere]"
                  >
                    {/* Lokasi */}
                    <div
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                        Lokasi
                      </span>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#0EA5A0] shrink-0" />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {mikaJob.location}
                        </span>
                      </div>
                    </div>

                    {/* Gaji */}
                    <div
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                        Estimasi Gaji
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Banknote size={14} className="text-[#0EA5A0] shrink-0" />
                        <span
                          className={`text-sm font-semibold${compactSalary ? " whitespace-nowrap" : ""}`}
                          style={{ color: "var(--text-primary)" }}
                        >
                          {salaryDisplay}
                        </span>
                      </div>
                    </div>

                    {/* Kuota */}
                    <div
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                        Kuota Diterima
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-[#0EA5A0] shrink-0" />
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {mikaJob.quota > 0 ? `${mikaJob.quota} Orang` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Batas Lamaran */}
                    <div
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                        Batas Lamaran
                      </span>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays
                          size={14}
                          className={`shrink-0 ${isExpiringSoon ? "text-red-500" : "text-[#0EA5A0]"}`}
                        />
                        <span
                          className={`text-sm font-semibold ${isExpiringSoon ? "text-red-500" : ""}`}
                          style={isExpiringSoon ? {} : { color: "var(--text-primary)" }}
                        >
                          {deadlineFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {mikaJob.description && (
                <div
                  className="p-6 sm:p-8 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Deskripsi Pekerjaan
                  </h2>
                  {/* Description is plain text converted at the DTO layer
                      (lib/html-to-plain-text.ts); never interpret it as DOM markup. */}
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line break-words"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {mikaJob.description}
                  </p>
                </div>
              )}

              {/* Responsibilities */}
              {mikaJob.responsibilities && (
                <div
                  className="p-6 sm:p-8 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Tanggung Jawab Utama
                  </h2>
                  <ul className="space-y-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {Array.isArray(mikaJob.responsibilities) ? (
                      mikaJob.responsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 size={18} className="text-[#0EA5A0] shrink-0 mt-0.5" />
                          <span>{resp}</span>
                        </li>
                      ))
                    ) : (
                      <p className="whitespace-pre-line">{String(mikaJob.responsibilities)}</p>
                    )}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {mikaJob.requirements && (
                <div
                  className="p-6 sm:p-8 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Kualifikasi & Persyaratan
                  </h2>
                  <ul className="space-y-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {Array.isArray(mikaJob.requirements) ? (
                      mikaJob.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 size={18} className="text-[#0EA5A0] shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))
                    ) : (
                      <p className="whitespace-pre-line">{String(mikaJob.requirements)}</p>
                    )}
                  </ul>
                </div>
              )}

              {/* Education Requirements */}
              {mikaJob.education_requirements &&
                (mikaJob.education_requirements.degrees?.length > 0 ||
                  mikaJob.education_requirements.majors?.length > 0) && (
                  <div
                    className="p-6 sm:p-8 rounded-2xl border"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap size={22} className="text-[#0EA5A0]" />
                      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                        Persyaratan Pendidikan
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {mikaJob.education_requirements.degrees?.length > 0 && (
                        <div>
                          <span
                            className="text-xs font-semibold uppercase tracking-wider block mb-2"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Jenjang Pendidikan:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {mikaJob.education_requirements.degrees.map((deg, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                                style={{
                                  backgroundColor: "var(--bg-secondary)",
                                  borderColor: "var(--border-subtle)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {deg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {mikaJob.education_requirements.majors?.length > 0 && (
                        <div>
                          <span
                            className="text-xs font-semibold uppercase tracking-wider block mb-2"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Jurusan / Bidang Studi Relevan:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {mikaJob.education_requirements.majors.map((major, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                                style={{
                                  backgroundColor: "var(--bg-secondary)",
                                  borderColor: "var(--border-subtle)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {major}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Benefits */}
              {mikaJob.benefits && (
                <div
                  className="p-6 sm:p-8 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Fasilitas & Benefit
                  </h2>
                  <ul className="space-y-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {Array.isArray(mikaJob.benefits) ? (
                      mikaJob.benefits.map((ben, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 size={18} className="text-[#0EA5A0] shrink-0 mt-0.5" />
                          <span>{ben}</span>
                        </li>
                      ))
                    ) : (
                      <p className="whitespace-pre-line">{String(mikaJob.benefits)}</p>
                    )}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {mikaJob.skills && mikaJob.skills.length > 0 && (
                <div
                  className="p-6 sm:p-8 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                    Keahlian yang Dibutuhkan
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {mikaJob.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Sidebar (1/3, Sticky) ── */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-28">

              {/* Tentang Perusahaan */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="px-6 pt-5 pb-4">
                  <h3
                    className="text-base font-bold mb-4"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Tentang Perusahaan
                  </h3>

                  {/* Company Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <MikaCompanyLogo
                        logo={mikaJob.company.logo}
                        companyName={mikaJob.company.name}
                        size={48}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {mikaJob.company.name}
                      </h4>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {mikaJob.company.city}
                      </span>
                    </div>
                  </div>

                  {/* Address (if location is available) */}
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl mb-4"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    <MapPin size={15} className="text-[#0EA5A0] shrink-0 mt-0.5" />
                    <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {mikaJob.location}, {mikaJob.company.city}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="px-6 pb-5 space-y-2.5"
                >
                  {/* Lihat Profil Perusahaan */}
                  <Link
                    href="/about"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors hover:bg-[#0EA5A0]/5"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Building2 size={14} />
                    Lihat Profil Perusahaan
                    <ChevronRight size={14} />
                  </Link>

                  {/* Website */}
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#0EA5A0]/10 text-[#0EA5A0] border border-[#0EA5A0]/20 hover:bg-[#0EA5A0]/15 transition-colors"
                  >
                    <Globe size={14} />
                     {applyUrl === "/contact" ? "Hubungi Tim Rekrutmen" : "Portal Rekrutmen"}
                  </a>
                </div>
              </div>

              {/* Sticky Apply CTA */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3
                  className="text-base font-bold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Tertarik dengan posisi ini?
                </h3>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Kirim lamaran Anda langsung ke tim rekrutmen {mikaJob.company.name}.
                </p>

                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0EA5A0] text-white font-bold text-sm hover:bg-[#0c8e8a] active:scale-95 transition-all"
                >
                  <Send size={16} />
                  Lamar Posisi Ini
                </a>

                {mikaJob.deadline_info.days_remaining > 0 && (
                  <p className="text-[11px] text-center mt-3" style={{ color: "var(--text-muted)" }}>
                    {mikaJob.deadline_info.days_remaining} hari tersisa untuk melamar
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Related Jobs Section ────────────────────────────────────────────── */}
          {mikaJob.related_jobs && mikaJob.related_jobs.length > 0 && (
            <div className="mt-20 pt-10 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-1 block">
                    Peluang Lainnya
                  </span>
                  <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Lowongan Terkait di Mika Career
                  </h3>
                </div>
                <Link
                  href="/careers"
                  className="text-xs font-semibold text-[#0EA5A0] hover:underline"
                >
                  Lihat Semua Lowongan →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mikaJob.related_jobs.map((relJob) => (
                  <MikaJobCard key={relJob.id} job={relJob} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
