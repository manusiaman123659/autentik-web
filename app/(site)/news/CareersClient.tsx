"use client";

import { useState } from "react";
import {
  Lightbulb,
  Globe,
  Users,
  Briefcase,
  MapPin,
  ArrowRight,
  Search,
  CheckCircle2,
  X,
  Send,
  Building2,
  Sparkles,
} from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import { careerPositions, CareerPosition } from "@/lib/data/careers";

export default function CareersClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("Semua");
  const [selectedJob, setSelectedJob] = useState<CareerPosition | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applyForm, setApplyForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    coverLetter: "",
  });

  const departments = ["Semua", "Engineering", "Procurement", "Production"];

  const filteredJobs = careerPositions.filter((job) => {
    const matchesDept =
      selectedDept === "Semua" || job.department.toLowerCase() === selectedDept.toLowerCase();
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsApplyOpen(false);
      setSelectedJob(null);
      setApplyForm({
        fullName: "",
        email: "",
        phone: "",
        portfolioUrl: "",
        coverLetter: "",
      });
    }, 2500);
  };

  return (
    <>
      {/* Hero Section */}
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
              Bergabung Bersama Tim Autentik
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
              Karir
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-light">
              Kami mencari talenta-talenta terbaik untuk bergabung bersama kami dalam menghadirkan solusi teknologi pintar bagi kehidupan yang lebih baik.
            </p>
          </AnimatedElement>
        </div>
      </section>

      {/* Mengapa Autentik Section */}
      <section className="py-24 px-6 lg:px-12" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto text-center mb-16">
          <AnimatedElement type="fade-up">
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Mengapa Autentik?
            </h2>
            <p
              className="text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Budaya kami dibangun atas inovasi, transparansi, dan komitmen untuk menyelesaikan tantangan teknologi terberat.
            </p>
          </AnimatedElement>
        </div>

        <AnimatedElement type="stagger" className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div
            className="rounded-3xl p-10 shadow-sm border text-center flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="w-14 h-14 bg-[#0EA5A0]/10 rounded-2xl flex items-center justify-center mb-6 text-[#0EA5A0]">
              <Lightbulb className="w-7 h-7" />
            </div>
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Inovasi Tanpa Batas
            </h3>
            <p
              className="font-light leading-relaxed text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Kami mendorong setiap anggota tim untuk berinovasi dan memberikan solusi terbaik bagi pelanggan.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="rounded-3xl p-10 shadow-sm border text-center flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="w-14 h-14 bg-[#0EA5A0]/10 rounded-2xl flex items-center justify-center mb-6 text-[#0EA5A0]">
              <Globe className="w-7 h-7" />
            </div>
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Dampak Nyata
            </h3>
            <p
              className="font-light leading-relaxed text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Solusi kami digunakan oleh berbagai industri untuk meningkatkan kualitas dan efisiensi.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="rounded-3xl p-10 shadow-sm border text-center flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="w-14 h-14 bg-[#0EA5A0]/10 rounded-2xl flex items-center justify-center mb-6 text-[#0EA5A0]">
              <Users className="w-7 h-7" />
            </div>
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Kolaborasi Tim
            </h3>
            <p
              className="font-light leading-relaxed text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Tim yang solid dan saling mendukung untuk mencapai tujuan bersama.
            </p>
          </div>
        </AnimatedElement>
      </section>

      {/* Open Positions Section */}
      <section className="py-24 px-6 lg:px-12" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Posisi Terbuka
              </h2>
              <p
                className="font-light text-sm sm:text-base"
                style={{ color: "var(--text-secondary)" }}
              >
                Temukan tantangan berikutnya di tim kami yang terus berkembang.
              </p>
            </div>

            {/* Department Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedDept === dept
                      ? "bg-[#0EA5A0] text-white shadow-md shadow-cyan-500/20"
                      : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                  style={
                    selectedDept !== dept
                      ? { backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }
                      : {}
                  }
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama posisi atau departemen..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0] transition-all"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Job Openings List */}
          <AnimatedElement type="fade-up" className="space-y-4">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div
                  key={job.slug}
                  onClick={() => setSelectedJob(job)}
                  className="rounded-2xl p-6 md:p-8 border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div>
                    <h3
                      className="text-xl font-bold mb-2 group-hover:text-[#0EA5A0] transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1 max-w-xl">
                      {job.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#0EA5A0]" />
                        <span>{job.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0EA5A0]" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                        job.typeBadgeColor === "green"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      }`}
                    >
                      {job.type}
                    </span>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#0EA5A0] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            ) : (
              <div
                className="text-center py-16 rounded-2xl border text-slate-400"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
              >
                <p className="text-base font-semibold">Tidak ada posisi yang cocok dengan kata kunci &quot;{searchQuery}&quot;</p>
                <p className="text-xs mt-1">Coba gunakan istilah pencarian lain atau pilih kategori Semua.</p>
              </div>
            )}
          </AnimatedElement>
        </div>
      </section>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b flex items-start justify-between relative" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full ${
                      selectedJob.typeBadgeColor === "green"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                    }`}
                  >
                    {selectedJob.type}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{selectedJob.department}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {selectedJob.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <div>
                <h4 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>Deskripsi Pekerjaan:</h4>
                <p className="whitespace-pre-line">{selectedJob.description.trim()}</p>
              </div>

              <div>
                <h4 className="font-bold text-base mb-3" style={{ color: "var(--text-primary)" }}>Tanggung Jawab Utama:</h4>
                <ul className="space-y-2">
                  {selectedJob.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-base mb-3" style={{ color: "var(--text-primary)" }}>Kualifikasi & Persyaratan:</h4>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-base mb-3" style={{ color: "var(--text-primary)" }}>Fasilitas & Benefit:</h4>
                <ul className="space-y-2">
                  {selectedJob.benefits.map((ben, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t flex items-center justify-between gap-4" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Building2 size={14} />
                <span>PT Autentik Karya Analitika (Semarang)</span>
              </div>
              <button
                onClick={() => setIsApplyOpen(true)}
                className="px-6 py-3 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-md transition-all flex items-center gap-2"
              >
                Lamar Posisi Ini
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Form Modal */}
      {isApplyOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 md:p-8 animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-[#0EA5A0]">Formulir Lamaran Pekerjaan</span>
                <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Lamar: {selectedJob.title}
                </h3>
              </div>
              <button
                onClick={() => setIsApplyOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Lamaran Berhasil Dikirim!</h4>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Terima kasih telah melamar. Tim HRD PT Autentik Karya Analitika akan meninjau kualifikasi Anda dan menghubungi via email/telepon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={applyForm.fullName}
                    onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Alamat Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={applyForm.email}
                      onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                      placeholder="nama@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Nomor Telepon / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={applyForm.phone}
                      onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    Link CV / Portofolio (Google Drive / LinkedIn) *
                  </label>
                  <input
                    type="url"
                    required
                    value={applyForm.portfolioUrl}
                    onChange={(e) => setApplyForm({ ...applyForm, portfolioUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username atau link Drive CV"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    Pesan Ringkas / Surat Lamaran Singkat
                  </label>
                  <textarea
                    rows={3}
                    value={applyForm.coverLetter}
                    onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                    placeholder="Ceritakan secara singkat keahlian dan motivasi Anda..."
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsApplyOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] flex items-center gap-2 shadow-md"
                  >
                    <Send size={14} />
                    Kirim Lamaran
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
