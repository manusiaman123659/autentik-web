import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "About Us | PT Autentik Karya Analitika",
  description:
    "PT Autentik Karya Analitika — Smart Technology is Yours. Menjadi perusahaan yang unggul di bidang penerapan teknologi pintar untuk akses kehidupan yang lebih baik.",
};

const missionPoints = [
  {
    number: "01",
    text: "Menciptakan peluang bagi insan perusahaan untuk meningkatkan kompetensi dan aktualisasi diri",
    english: "Creating opportunities for employees to enhance their skills and self-actualization",
  },
  {
    number: "02",
    text: "Membangun manajemen sumber daya manusia yang efektif dan efisien",
    english: "Building effective and efficient human resource management",
  },
  {
    number: "03",
    text: "Mengembangkan teknologi pintar inovatif dengan fokus pada keberlanjutan",
    english: "Developing innovative smart technology with a focus on sustainability",
  },
  {
    number: "04",
    text: "Memberikan layanan pelanggan terbaik dengan fokus pada kepuasan pengguna",
    english: "Providing the best customer service with a focus on user satisfaction",
  },
  {
    number: "05",
    text: "Menjalin kemitraan strategis untuk memperkuat ekosistem teknologi",
    english: "Forging strategic partnerships to strengthen the technology ecosystem",
  },
];

const firstValues = [
  {
    letter: "F",
    title: "Faith in God",
    english: "We believe in the existence and power of God",
    indonesian: "Kami percaya akan keberadaan dan kuasa Tuhan",
  },
  {
    letter: "I",
    title: "Innovative",
    english: "Always innovate and take action continuous improvement",
    indonesian: "Selalu berinovasi dan melakukan tindakan perbaikan yang berkelanjutan",
  },
  {
    letter: "R",
    title: "Resilience",
    english: "Facing change with confidence",
    indonesian: "Menghadapi perubahan dengan percaya diri",
  },
  {
    letter: "S",
    title: "Serve",
    english: "Providing the best service to customers in a professional manner",
    indonesian: "Memberikan layanan terbaik kepada pelanggan secara profesional",
  },
  {
    letter: "T",
    title: "Totality",
    english: "Consciously and with integrity carry out duties and responsibilities by giving complete solution",
    indonesian: "Secara sadar dan penuh integritas melaksanakan tugas dan tanggung jawab dengan memberi solusi yang tuntas",
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
        className="pt-36 pb-24 relative overflow-hidden"
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

        <div className="max-w-7xl mx-auto px-6 lg:px-16 relative z-10">
          {/* Hero Header */}
          <AnimatedElement type="fade-up" className="text-center mb-16">
            <div className="mb-8 w-32 h-32 mx-auto flex justify-center items-center hover:scale-105 transition-all duration-500 bg-white rounded-full p-4 shadow-2xl">
              <Image
                src="/images/logo_aka/akaaaaaaa.png"
                alt="Autentik Logo"
                width={200}
                height={200}
                className="w-24 h-24 object-contain transition-transform duration-500"
              />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
              Membangun Solusi Cerdas
              <br />
              <span className="text-[#0EA5A0]">&amp; Otomasi Berkelanjutan</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light max-w-3xl mx-auto mb-4">
              PT Autentik Karya Analitika adalah perusahaan teknologi pintar yang berkomitmen memberikan solusi otomasi dan IoT industri terintegrasi untuk laboratorium, manufaktur, dan lingkungan kerja di seluruh Indonesia.
            </p>
            <p className="text-sm text-slate-400 font-light">
              Smart Technology is Yours
            </p>
          </AnimatedElement>

          {/* Visi & Misi Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* VISI */}
            <AnimatedElement type="fade-up">
              <div className="p-8 md:p-10 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-[#0EA5A0] font-black italic text-3xl">I.</span>
                    <span className="text-white">Visi</span>
                  </h2>
                  <p className="text-lg md:text-xl leading-relaxed font-medium text-white mb-4">
                    Menjadi perusahaan yang unggul di bidang penerapan teknologi pintar untuk akses kehidupan yang lebih baik.
                  </p>
                </div>
                <p className="text-sm italic mt-4 font-light text-slate-400">
                  (To become a leading company in applying smart technology for a better life)
                </p>
              </div>
            </AnimatedElement>

            {/* MISI */}
            <AnimatedElement type="fade-up">
              <div className="p-8 md:p-10 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-[#0EA5A0] font-black italic text-3xl">II.</span>
                    <span className="text-white">Misi</span>
                  </h2>
                  <ul className="space-y-4 font-medium list-none">
                    {missionPoints.map((point) => (
                      <li key={point.number} className="relative pl-5">
                        <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-[#0EA5A0]" />
                        <span className="text-white">{point.text}</span>
                        <span className="text-xs italic mt-1 block font-light text-slate-400">
                          ({point.english})
                        </span>
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
              <span>Core Value</span>
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
                  {val.english}
                  <span className="italic text-xs sm:text-sm text-slate-400 mt-2 block">
                    ({val.indonesian})
                  </span>
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
              <span>Kebijakan Mutu</span>
            </h2>
            <p className="text-lg sm:text-xl font-light leading-relaxed mb-10 max-w-3xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>PT. Autentik Karya Analitika</span> adalah Perusahaan teknologi pintar yang senantiasa berkomitmen untuk memberikan dan meningkatkan kepuasan pelanggan dengan cara:
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
                  <span style={{ color: "var(--text-secondary)" }}>Memberikan </span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                    produk dan layanan yang berkualitas prima
                  </span>
                </li>
                <li className="relative pl-10">
                  <span className="absolute left-0 top-0.5 text-[#0EA5A0]">
                    <Eye className="w-6 h-6" />
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>Meninjau sasaran mutu dan kebijakan mutu secara berkala demi terlaksananya </span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                    peningkatan berkelanjutan
                  </span>
                </li>
                <li className="relative pl-10">
                  <span className="absolute left-0 top-0.5 text-[#0EA5A0]">
                    <Target className="w-6 h-6" />
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>Menerapkan Sistem Manajemen Mutu </span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                    ISO 9001:2015
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}> secara konsisten</span>
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
                &quot;Direktur beserta seluruh staf bertekad untuk terus bekerjasama dalam mewujudkan kebijakan mutu ini.&quot;
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
              Company Profile
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Profil Perusahaan &amp; Dokumen Resmi
            </h2>
            <p className="text-base sm:text-lg font-light max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Jelajahi company profile kami untuk mengetahui lebih dalam tentang visi, misi, produk, dan layanan yang kami tawarkan.
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
              <CompanyProfileViewer manifest={comproManifest} />
            </div>
          </AnimatedElement>

          <AnimatedElement type="fade-up">
            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">
              <p className="text-xs font-light" style={{ color: "var(--text-secondary)" }}>
                Format Dokumen Interaktif &bull; {comproManifest?.pdfUrl ? "Tersedia dalam PDF" : "40 Halaman"}
              </p>
              <Link
                href="/research-partnership"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0EA5A0] hover:underline"
              >
                Research &amp; Partnership
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
                  Tim Kami
                </h2>
                <p className="text-sm font-light max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Para profesional yang berdedikasi di balik inovasi dan pelayanan PT Autentik Karya Analitika.
                </p>
              </div>
            </AnimatedElement>

            <TeamCarousel members={teamMembers} />
          </div>
        </section>
      )}

      {/* Combined GRUP KAMI & PARTNER KAMI Section */}
      <section className="py-24 px-6 lg:px-16 text-white" style={{ backgroundColor: "#0B1F3A" }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedElement type="fade-up">
            <div className="flex flex-col xl:flex-row gap-16 xl:gap-12 justify-between">
              
              {/* LEFT HALF: GRUP KAMI */}
              <div className="w-full xl:w-1/2">
                <div className="text-center xl:text-left mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
                    Grup Kami
                  </h2>
                  <p className="text-slate-300 text-sm font-light max-w-lg mx-auto xl:mx-0">
                    Perusahaan afiliasi yang menjadi bagian integral dari ekosistem Autentik.
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
              <div className="hidden xl:block w-px bg-white/15 self-stretch" />

              {/* RIGHT HALF: PARTNER KAMI */}
              <div className="w-full xl:w-1/2">
                <div className="text-center xl:text-left mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
                    Partner Kami
                  </h2>
                  <p className="text-slate-300 text-sm font-light max-w-lg mx-auto xl:mx-0">
                    Kolaborasi strategis dengan berbagai pimpinan teknologi & institusi pendidikan.
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
                Kolaborasi Industri &amp; Pengadaan
              </h3>
              <p className="text-sm font-light leading-relaxed mb-8 flex-1" style={{ color: "var(--text-secondary)" }}>
                Diskusikan kebutuhan instrumen laboratorium, furnitur, kalibrasi, dan solusi teknis terintegrasi dengan tim ahli kami.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:opacity-90"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  Hubungi Tim Sales
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold border transition-all"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
                >
                  Katalog Produk
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
                Program Karir &amp; Magang
              </h3>
              <p className="text-sm font-light leading-relaxed mb-8 flex-1" style={{ color: "var(--text-secondary)" }}>
                Bergabung bersama tim kami dalam mengembangkan teknologi IoT dan otomasi industri.
              </p>
              <div>
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:opacity-90"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  Lihat Posisi Tersedia
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
