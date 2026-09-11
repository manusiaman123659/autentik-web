"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Sparkles,
  Lightbulb,
  Users,
  Search,
  TrendingUp,
  HeartHandshake,
  Send,
} from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import MikaJobCard from "@/components/careers/MikaJobCard";
import MikaJobFilter from "@/components/careers/MikaJobFilter";
import MikaPagination from "@/components/careers/MikaPagination";
import { getMikaJobs } from "@/lib/api/mika-career";
import type { MikaJob, MikaDepartment, MikaPaginationMeta } from "@/types/mika-career";

interface CareersClientProps {
  initialJobs: MikaJob[];
  initialMeta: MikaPaginationMeta;
  departments: MikaDepartment[];
  recruitmentUrl: string | null;
  apiMessage?: string;
}

export default function CareersClient({
  initialJobs,
  initialMeta,
  departments,
  recruitmentUrl,
  apiMessage,
}: CareersClientProps) {
  const [jobs, setJobs] = useState<MikaJob[]>(initialJobs);
  const [meta, setMeta] = useState<MikaPaginationMeta>(initialMeta);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Fetch jobs dynamically when filters or page change
  const fetchFilteredJobs = useCallback(
    (pageNumber: number = 1) => {
      startTransition(async () => {
        const res = await getMikaJobs({
          page: pageNumber,
          per_page: 10,
          search: searchQuery,
          department_id: selectedDept,
          employment_type: selectedEmploymentType,
          location: selectedLocation,
        });

        if (res && res.data) {
          setJobs(res.data);
          setMeta(res.meta);
        }
      });
    },
    [searchQuery, selectedDept, selectedEmploymentType, selectedLocation]
  );

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredJobs(1);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedDept, selectedEmploymentType, selectedLocation, fetchFilteredJobs]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDept("all");
    setSelectedEmploymentType("all");
    setSelectedLocation("all");
  };

  const handlePageChange = (newPage: number) => {
    fetchFilteredJobs(newPage);
    // Smooth scroll to top of job list
    const el = document.getElementById("jobs-list-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* ─── Hero Section ────────────────────────────────────────────────────────── */}
      <section
        className="pt-32 pb-20 relative overflow-hidden"
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
        <div
          className="absolute top-10 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #0EA5A0, transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <AnimatedElement type="fade-up" className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} />
              Mika Career - Portal Rekrutmen & Karir
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
              Wujudkan Potensi Terbaik Anda Bersama Kami
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-light mb-8">
              Jelajahi berbagai peluang karir menarik di bidang teknologi instrumentasi, IoT, software engineering, dan technical sales. Kami mengundang talenta berdedikasi untuk bertumbuh bersama.
            </p>

            {/* Quick Stats Strip */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-700/60">
              <div>
                <span className="block text-2xl font-bold text-white">
                  {meta.total_items}
                </span>
                <span className="text-xs text-slate-400">Posisi Lowongan Aktif</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <span className="block text-2xl font-bold text-teal-400">
                  {departments.length}
                </span>
                <span className="text-xs text-slate-400">Departemen Kerja</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <span className="block text-2xl font-bold text-white">100%</span>
                <span className="text-xs text-slate-400">Peluang Pertumbuhan Karir</span>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Mengapa Bergabung Section ───────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <AnimatedElement type="fade-up">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
                Budaya & Nilai
              </span>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Mengapa Membangun Karir di Sini?
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Kami percaya inovasi lahir dari kolaborasi yang sehat, apresiasi terhadap kontribusi, dan ruang bertumbuh yang terbuka lebar bagi setiap individu.
              </p>
            </AnimatedElement>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedElement type="fade-up" delay={0.1}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <Lightbulb size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Inovasi Tanpa Batas
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Bekerja langsung dengan teknologi modern: IoT, Next.js, sensor industri, dan analitika data presisi tinggi.
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.2}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <Users size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Tim Kolaboratif
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Lingkungan kerja suportif, komunikasi terbuka tanpa sekat birokrasi kaku, serta saling mendorong kemajuan.
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.3}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <TrendingUp size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Jenjang Karir Terarah
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Evaluasi kinerja transparan, program mentoring, serta dukungan anggaran sertifikasi dan pelatihan profesional.
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.4}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <HeartHandshake size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Kesejahteraan Karyawan
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Kompensasi kompetitif, asuransi BPJS lengkap, waktu kerja fleksibel/hybrid, dan penghargaan apresiasi berkala.
                  </p>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* ─── Jobs Listing Section ─────────────────────────────────────────────────── */}
      <section
        id="jobs-list-section"
        className="py-20 px-6 lg:px-12 scroll-mt-20"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
                Peluang Tersedia
              </span>
              <h2
                className="text-3xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Daftar Lowongan Pekerjaan
              </h2>
            </div>

            {apiMessage && (
              <div
                className="text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{apiMessage}</span>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <MikaJobFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDepartment={selectedDept}
            onDepartmentChange={setSelectedDept}
            selectedEmploymentType={selectedEmploymentType}
            onEmploymentTypeChange={setSelectedEmploymentType}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            departments={departments}
            onReset={handleResetFilters}
            totalResults={meta.total_items}
          />

          {/* Loading Indicator */}
          {isPending && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0EA5A0]">
                <div className="w-4 h-4 rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
                Memperbarui lowongan...
              </div>
            </div>
          )}

          {/* Jobs Grid or Empty State */}
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <MikaJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-16 px-6 rounded-2xl border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Search size={28} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                Tidak ada lowongan yang sesuai
              </h3>
              <p
                className="text-sm max-w-md mx-auto mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Kami tidak menemukan lowongan dengan kriteria filter yang Anda pilih. Coba sesuaikan kata kunci atau reset filter pencarian.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0c8e8a] transition-colors"
              >
                Reset Semua Filter
              </button>
            </div>
          )}

          {/* Pagination */}
          <MikaPagination meta={meta} onPageChange={handlePageChange} />
        </div>
      </section>

      {/* ─── Spontaneous Application / CTA ───────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12 border-t" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedElement type="fade-up">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
              Inisiatif Karir
            </span>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Belum Menemukan Posisi yang Sesuai?
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Kami selalu terbuka bagi talenta-talenta luar biasa. Kirimkan CV dan portofolio Anda ke basis data rekrutmen kami untuk dihubungi saat posisi yang relevan dibuka.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {recruitmentUrl ? (
                <a
                  href={recruitmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20"
                >
                  <Send size={16} />
                  Kirim Lamaran Terbuka
                </a>
              ) : (
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20"
                >
                  <Send size={16} />
                  Hubungi Tim Rekrutmen
                </a>
              )}
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
