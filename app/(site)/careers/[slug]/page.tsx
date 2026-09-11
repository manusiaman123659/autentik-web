import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  CheckCircle2,
  Building2,
  Banknote,
  Clock,
  Users,
  GraduationCap,
  Send,
} from "lucide-react";
import { getMikaJobDetail } from "@/lib/api/mika-career";
import { getPublicCareerBySlug, getRecruitmentUrl } from "@/lib/public-data";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import MikaJobCard from "@/components/careers/MikaJobCard";
import JsonLd from "@/components/seo/JsonLd";
import type { MikaJobDetail } from "@/types/mika-career";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mikaJob = await getMikaJobDetail(slug);

  if (mikaJob) {
    return {
      title: `${mikaJob.title} — Mika Career | ${mikaJob.company.name}`,
      description:
        mikaJob.description ||
        `Lowongan kerja ${mikaJob.title} (${mikaJob.employment_type}) di ${mikaJob.company.name}, ${mikaJob.location}.`,
    };
  }

  const legacyJob = await getPublicCareerBySlug(slug);
  if (legacyJob) {
    return {
      title: `${legacyJob.title} - Karir | PT Autentik Karya Analitika`,
      description: legacyJob.summary,
    };
  }

  return {
    title: "Posisi Karir Tidak Ditemukan | Mika Career",
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const recruitmentUrl = await getRecruitmentUrl();

  // 1. Coba ambil dari Mika Career API
  const mikaJob: MikaJobDetail | null = await getMikaJobDetail(slug);

  // 2. Jika tidak ditemukan, fallback ke legacy career data
  if (!mikaJob) {
    const legacyJob = await getPublicCareerBySlug(slug);
    if (!legacyJob) notFound();

    // Render layout kompatibel untuk data legacy
    return (
      <>
        <section
          className="pt-32 pb-20 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <AnimatedElement type="fade-up">
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm mb-8 transition-colors"
              >
                <ArrowLeft size={16} />
                Kembali ke Mika Career
              </Link>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-teal-500/20 text-[#14B8A6] border border-teal-500/30">
                  {legacyJob.type}
                </span>
                <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                  <Briefcase size={14} className="text-[#14B8A6]" />
                  {legacyJob.department}
                </span>
                <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#14B8A6]" />
                  {legacyJob.location}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                {legacyJob.title}
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">{legacyJob.summary}</p>
            </AnimatedElement>
          </div>
        </section>

        <section className="py-16" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div
              className="p-8 rounded-2xl border shadow-sm"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Deskripsi Pekerjaan
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                {legacyJob.description.trim()}
              </p>
            </div>

            <div className="pt-8 border-t flex items-center justify-between gap-4" style={{ borderColor: "var(--border-subtle)" }}>
              <Link href="/careers" className="text-sm font-semibold text-[#0EA5A0] hover:underline">
                ← Lihat lowongan lainnya di Mika Career
              </Link>
              {recruitmentUrl && (
                <a
                  href={recruitmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-all"
                >
                  Lamar Sekarang
                </a>
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  // Mika Job JSON-LD Schema
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: mikaJob.title,
    description: mikaJob.description || mikaJob.title,
    datePosted: mikaJob.created_at || "2026-09-01",
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

  const applyUrl = mikaJob.apply_url || recruitmentUrl || "/contact";
  const isExpiringSoon = mikaJob.deadline_info.days_remaining <= 7 && !mikaJob.deadline_info.is_expired;

  return (
    <>
      <JsonLd data={jsonLdData} />

      {/* ─── Hero Header ───────────────────────────────────────────────────────── */}
      <section
        className="pt-32 pb-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Kembali ke Daftar Mika Career
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Briefcase size={12} />
                {mikaJob.employment_type}
              </span>
              <span className="text-slate-300 text-xs font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                {mikaJob.department.name}
              </span>
              {mikaJob.quota > 0 && (
                <span className="text-slate-300 text-xs font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10 flex items-center gap-1">
                  <Users size={12} />
                  Kuota: {mikaJob.quota} Orang
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {mikaJob.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={16} className="text-[#14B8A6]" />
                {mikaJob.company.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={16} className="text-[#14B8A6]" />
                {mikaJob.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Banknote size={16} className="text-emerald-400" />
                {mikaJob.salary.formatted}
              </span>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Main Content & Sticky Sidebar ─────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left Content (2 Cols) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {mikaJob.description && (
                <div
                  className="p-8 rounded-2xl border shadow-sm"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Deskripsi Pekerjaan
                  </h2>
                  {/<[a-z][\s\S]*>/i.test(mikaJob.description) ? (
                    <div
                      className="text-sm leading-relaxed space-y-3 prose prose-slate dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-[#0EA5A0]"
                      style={{ color: "var(--text-secondary)" }}
                      dangerouslySetInnerHTML={{ __html: mikaJob.description }}
                    />
                  ) : (
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {mikaJob.description}
                    </p>
                  )}
                </div>
              )}

              {/* Responsibilities */}
              {mikaJob.responsibilities && (
                <div
                  className="p-8 rounded-2xl border shadow-sm"
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
                          <CheckCircle2
                            size={18}
                            className="text-[#0EA5A0] shrink-0 mt-0.5"
                          />
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
                  className="p-8 rounded-2xl border shadow-sm"
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
                          <CheckCircle2
                            size={18}
                            className="text-[#0EA5A0] shrink-0 mt-0.5"
                          />
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
              {mikaJob.education_requirements && (
                (mikaJob.education_requirements.degrees?.length > 0 ||
                  mikaJob.education_requirements.majors?.length > 0) && (
                  <div
                    className="p-8 rounded-2xl border shadow-sm"
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
                )
              )}

              {/* Benefits */}
              {mikaJob.benefits && (
                <div
                  className="p-8 rounded-2xl border shadow-sm"
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
                          <CheckCircle2
                            size={18}
                            className="text-[#0EA5A0] shrink-0 mt-0.5"
                          />
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
                  className="p-8 rounded-2xl border shadow-sm"
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

            {/* Right Sidebar (1 Col, Sticky) */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-28">
              <div
                className="p-6 rounded-2xl border shadow-md"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <h3
                  className="text-base font-bold pb-4 border-b mb-5"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
                >
                  Ringkasan Lowongan
                </h3>

                <div className="space-y-4 text-sm mb-6">
                  <div>
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                      Estimasi Gaji
                    </span>
                    <div className="flex items-center gap-2 font-bold text-base" style={{ color: "var(--text-primary)" }}>
                      <Banknote size={18} className="text-emerald-500" />
                      {mikaJob.salary.formatted}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                      Batas Waktu Lamaran
                    </span>
                    <div
                      className={`flex items-center gap-2 font-semibold ${
                        isExpiringSoon ? "text-red-500" : ""
                      }`}
                      style={!isExpiringSoon ? { color: "var(--text-primary)" } : undefined}
                    >
                      <Clock size={16} className={isExpiringSoon ? "text-red-500" : "text-[#0EA5A0]"} />
                      <span>{mikaJob.deadline_info.badge.label}</span>
                    </div>
                    {mikaJob.deadline_info.days_remaining > 0 && (
                      <span className="text-xs text-slate-400 ml-6 block">
                        ({mikaJob.deadline_info.days_remaining} hari tersisa)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                      Tipe Pekerjaan & Departemen
                    </span>
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {mikaJob.employment_type} • {mikaJob.department.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                      Lokasi Penempatan
                    </span>
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {mikaJob.location} ({mikaJob.company.city})
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0EA5A0] text-white font-bold text-sm shadow-md shadow-teal-500/20 hover:bg-[#0c8e8a] hover:shadow-lg transition-all mb-3 text-center"
                >
                  <Send size={16} />
                  Lamar Posisi Ini
                </a>

                <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                  Lamaran akan diproses langsung oleh tim rekrutmen {mikaJob.company.name}.
                </p>
              </div>

              {/* Company Info Box */}
              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center font-bold text-lg">
                    {mikaJob.company.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      {mikaJob.company.name}
                    </h4>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {mikaJob.company.city}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Perusahaan teknologi yang berkomitmen menghadirkan inovasi instrumen presisi dan sistem monitoring berkualitas tinggi.
                </p>
              </div>
            </div>
          </div>

          {/* ─── Related Jobs Section ────────────────────────────────────────────── */}
          {mikaJob.related_jobs && mikaJob.related_jobs.length > 0 && (
            <div className="mt-24 pt-12 border-t" style={{ borderColor: "var(--border-subtle)" }}>
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