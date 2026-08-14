import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin, CheckCircle2, Building2 } from "lucide-react";
import { getPublicCareerBySlug, getRecruitmentUrl } from "@/lib/public-data";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import ApplyRecruitmentButton from "@/components/careers/ApplyRecruitmentButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublicCareerBySlug(slug);
  if (!job)
    return {
      title: "Posisi Karir Tidak Ditemukan | Autentik",
    };

  return {
    title: `${job.title} - Karir | PT Autentik Karya Analitika`,
    description: job.summary,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getPublicCareerBySlug(slug);

  if (!job) notFound();

  const recruitmentUrl = await getRecruitmentUrl();

  return (
    <>
      {/* Job Header */}
      <section
        className="pt-32 pb-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm mb-8 transition-colors"
            >
              <ArrowLeft size={16} />
              Kembali ke Karir & Posisi Terbuka
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                  job.typeBadgeColor === "green"
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {job.type}
              </span>
              <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#14B8A6]" />
                {job.department}
              </span>
              <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <MapPin size={14} className="text-[#14B8A6]" />
                {job.location}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {job.title}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">{job.summary}</p>
          </AnimatedElement>
        </div>
      </section>

      {/* Job Details Content */}
      <section className="py-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up" className="space-y-8">
            <div className="p-8 rounded-3xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Deskripsi Pekerjaan</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                {job.description.trim()}
              </p>
            </div>

            <div className="p-8 rounded-3xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Tanggung Jawab Utama</h3>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-3xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Kualifikasi & Persyaratan</h3>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-3xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Fasilitas & Benefit</h3>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {job.benefits.map((ben, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Building2 size={16} />
                <span>PT Autentik Karya Analitika (Semarang, Jawa Tengah)</span>
              </div>
              <ApplyRecruitmentButton url={recruitmentUrl} className="px-8 py-3.5" />
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}