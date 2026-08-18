"use client";

import { useState } from "react";
import Link from "next/link";
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
    title: "Pemantauan Kualitas & Telemetri IoT",
    subtitle: "Integrasi sensor pintar & sistem peringatan dini otomatis",
    description:
      "Layanan pengerjaan dan instalasi sistem pemantauan berbasis Internet of Things (IoT) secara real-time untuk pengawasan mutu air, udara emisi, dan parameter lingkungan industri secara efisien.",
    highlights: [
      "Sensor Kualitas Air & Emisi Berpresisi Tinggi",
      "Konektivitas Telemetri (LoRaWAN / 4G / RS485)",
      "Sistem Notifikasi & Alarm Bahaya Otomatis (SMS/WA/Email)",
      "Penyimpanan Data Terenkripsi di Cloud & Server Lokal",
    ],
    target: "Pabrik Industri, Pengolahan IPAL, Laboratorium Pengujian Lingkungan",
  },
  {
    id: "lab-engineering",
    category: "lab",
    icon: "LayoutDashboard",
    title: "Rekayasa & Furnitur Laboratorium",
    description: "Perancangan tata ruang, meja kerja tahan kimia, dan sistem exhaust fume hood",
    highlights: [
      "Desain Tata Letak Lab (Layouting 3D & Ergonomi)",
      "Manufaktur Meja Lab (Phenolic Resin & Stainless Steel)",
      "Sistem Fume Hood & Laminar Air Flow Presisi High-Flow",
      "Sertifikasi Keamanan & Saluran Ducting Tahan KOROSIF",
    ],
    target: "Laboratorium Farmasi, Kimia, Pendidikan, & Riset Industri",
  },
  {
    id: "calibration",
    category: "maintenance",
    icon: "Settings",
    title: "Kalibrasi & Perawatan Alat",
    description: "Layanan servis proaktif, validasi akurasi, dan perbaikan perangkat laboratorium",
    highlights: [
      "Kalibrasi Berkala Berstandar ISO/IEC 17025",
      "Perawatan Pencegahan (Preventive Maintenance)",
      "Perbaikan & Troubleshooting Komponen Elektrik/Mekanis",
      "Penerbitan Sertifikat Kalibrasi Resmi & Record Log",
    ],
    target: "Semua Laboratorium Pengujian, Industri Manufaktur, QC/QA Unit",
  },
  {
    id: "water-treatment",
    category: "water",
    icon: "Droplets",
    title: "Pengolahan & Pemurnian Air Industri",
    description: "Solusi air murni ultra-pure (RO/EDI) dan sistem filtrasi air limbah otomatis",
    highlights: [
      "Instalasi Reverse Osmosis (RO) & Deionisasi (EDI)",
      "Dosing Pump Otomatis & Pemantauan IPAL Online",
      "Dry Desiccator & Kabinet Pengontrol Kelembaban Air",
      "Pengujian Kualitas Air Pasca-Penyaringan Berstandar SNI",
    ],
    target: "Industri Makanan-Minuman, Farmasi, Pembangkit Listrik, Tekstil",
  },
  {
    id: "platform-integration",
    category: "iot",
    icon: "BarChart2",
    title: "Integrasi Platform Cloud & Analytics",
    description: "Dashboard kustomisasi untuk visualisasi data sensor dan laporan analitis",
    highlights: [
      "Pengembangan Web Dashboard & Multi-Tenant Portal",
      "Analisis Tren & Prediksi Kerusakan Alat (Predictive AI)",
      "Ekspor Laporan Otomatis untuk Audit Regulasi",
      "Integrasi Rest API ke ERP Enterprise (SAP, Oracle, Odoo)",
    ],
    target: "Manajemen Pabrik, Direksi Operasional, Tim Compliance",
  },
  {
    id: "consulting",
    category: "lab",
    icon: "Headset",
    title: "Konsultasi Teknis & Audit Standardisasi",
    description: "Pendampingan penyusunan spesifikasi, audit efisiensi, dan persiapan akreditasi",
    highlights: [
      "Studi Kelayakan & Perencanaan Anggaran Pengadaan Lab",
      "Pendampingan Akreditasi Laboratorium (ISO/IEC 17025)",
      "Audit Keamanan Lingkungan Kerja & Manajemen Limbah",
      "Pelatihan Operasional & Troubleshooting untuk Operator",
    ],
    target: "Perusahaan Baru (Greenfield Project), Lab Upgrade & Akreditasi",
  },
];

const fulfillmentPaths = [
  {
    icon: PackageCheck,
    title: "Stok Siap — Beli Langsung",
    description:
      "Produk yang tersedia di gudang dapat langsung dibeli dan di-checkout di halaman Store kami, lengkap dengan harga, stok, dan proses pengiriman.",
    points: ["Harga & stok transparan", "Checkout online cepat", "Pengiriman reguler"],
    cta: { label: "Kunjungi Store", href: "/store" },
    tone: "#0EA5A0",
  },
  {
    icon: Wrench,
    title: "Pesanan Kustom — Konsultasi Dulu",
    description:
      "Barang dibuat sesuai kebutuhan spesifik Anda — dimensi, material, kapasitas, hingga integrasi khusus. Tim engineer membahas kelayakan & penawaran sebelum produksi.",
    points: ["Spesifikasi sesuai kebutuhan", "Estimasi biaya & waktu pengerjaan", "Gambaran teknis dari engineer"],
    cta: { label: "Ajukan Kebutuhan Custom", href: "/custom-request" },
    tone: "#0B1F3A",
  },
  {
    icon: Headset,
    title: "Pihak Ketiga — Kami Bantu Procurement",
    description:
      "Produk dari vendor/prinsipal pihak ketiga yang kami kelola pengadaannya, lengkap dengan konsultasi technical support agar sesuai aplikasi Anda.",
    points: ["Pengadaan dikelola tim kami", "Technical support khusus", "Spesifikasi teknis terverifikasi"],
    cta: {
      label: "Hubungi Technical Support",
      href: "https://wa.me/6282137384029?text=Halo, saya butuh bantuan technical support dan pengadaan produk pihak ketiga.",
      external: true,
    },
    tone: "#25D366",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Konsultasi & Survey Lokasi",
    desc: "Tim teknis kami melakukan asesmen awal mendalam terhadap kebutuhan spesifik dan kondisi aktual di lapangan.",
  },
  {
    step: "02",
    title: "Desain & Rekayasa Solusi",
    desc: "Penyusunan dokumen rekayasa teknis, spesifikasi instrumen, serta estimasi anggaran yang efisien.",
  },
  {
    step: "03",
    title: "Instalasi & Integrasi",
    desc: "Pemasangan fisik, pengkabelan, dan integrasi perangkat IoT / instrumen oleh teknisi berpengalaman.",
  },
  {
    step: "04",
    title: "Testing & Commissioning",
    desc: "Pengujian fungsionalitas menyeluruh, kalibrasi awal, serta uji coba operasional (Dry & Wet Run).",
  },
  {
    step: "05",
    title: "Pelatihan & Serah Terima",
    desc: "Pelatihan komprehensif bagi personil operator serta penyerahan sertifikat garansi dan dokumentasi resmi.",
  },
];

const faqs = [
  {
    question: "Apakah layanan kalibrasi Autentik bersertifikat resmi?",
    answer:
      "Ya, seluruh kalibrasi dan validasi alat kami mengacu pada metode standar internasional ISO/IEC 17025 dan dilakukan oleh teknisi bersertifikasi ahli.",
  },
  {
    question: "Apakah sistem IoT dapat disesuaikan dengan kebutuhan pabrik kami?",
    answer:
      "Tentu saja. Perangkat keras IoT dan dashboard pemantauan cloud kami dikembangkan secara modular dan in-house, sehingga dapat disesuaikan dengan protokol dan sensor yang ada di pabrik Anda.",
  },
  {
    question: "Berapa lama garansi layanan dan perangkat keras yang diberikan?",
    answer:
      "Kami memberikan garansi resmi sparepart & layanan teknis hingga 12-24 bulan (tergantung paket layanan) lengkap dengan garansi dukungan tim teknis purna jual.",
  },
  {
    question: "Bagaimana cara mengajukan permintaan survey lokasi atau konsultasi awal?",
    answer:
      "Anda dapat langsung menghubungi tim teknis kami melalui tombol 'Hubungi Tim Layanan' di bawah atau via Whatsapp/Email. Tim kami siap merespon dalam 1x24 jam kerja.",
  },
];

export default function ServicesPage() {
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
        className="py-24 relative overflow-hidden"
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up" className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles size={14} />
                Layanan & Rekayasa Terintegrasi
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                Solusi Layanan Teknis{" "}
                <span className="text-[#14B8A6]">Laboratorium & Industri</span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-2xl">
                PT Autentik Karya Analitika menghadirkan ekosistem layanan lengkap mulai dari integrasi telemetri IoT, rekayasa tata ruang lab, pemurnian air industri, hingga kalibrasi instrumen berstandar tinggi.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  id="services-consult-btn"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-cyan-500/20 hover:opacity-95"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  Hubungi Tim Layanan
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#services-list"
                  id="services-[#services-list]-btn"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all"
                >
                  Lihat Katalog Layanan
                </Link>
              </div>
            </div>

            {/* Right Badge Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <ShieldCheck size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-white font-bold text-base mb-1">Standar ISO 17025</h4>
                <p className="text-xs text-slate-400">Jaminan kepatuhan akurasi & regulasi pengujian.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Cpu size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-white font-bold text-base mb-1">IoT Smart System</h4>
                <p className="text-xs text-slate-400">Telemetri sensor realtime 24/7 di cloud.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Wrench size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-white font-bold text-base mb-1">Teknisi Berpengalaman</h4>
                <p className="text-xs text-slate-400">Dukungan ahli tersertifikasi untuk instalasi presisi.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Clock size={32} className="text-[#14B8A6] mb-3" />
                <h4 className="text-white font-bold text-base mb-1">Dukungan Purna Jual</h4>
                <p className="text-xs text-slate-400">Respon cepat & pemeliharaan berkesinambungan.</p>
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
              title="Portofolio Layanan Profesional"
              subtitle="Pilih kategori layanan yang sesuai dengan kebutuhan operasional perusahaan dan fasilitas laboratorium Anda."
              align="center"
            />
          </AnimatedElement>

          {/* Filter Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { key: "all", label: "Semua Layanan" },
              { key: "iot", label: "IoT & Pemantauan" },
              { key: "lab", label: "Rekayasa & Design Lab" },
              { key: "maintenance", label: "Kalibrasi & Perawatan" },
              { key: "water", label: "Pengolahan Air" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeCategory === tab.key
                    ? "bg-[#0EA5A0] text-white shadow-md shadow-cyan-500/20"
                    : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
                style={
                  activeCategory !== tab.key
                    ? { backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }
                    : {}
                }
              >
                {tab.label}
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
                      {service.title}
                    </h3>
                    <p
                      className="text-sm mb-6 leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {service.description}
                    </p>

                    <div className="space-y-2.5 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Fitur Utama & Keunggulan:
                      </p>
                      {service.highlights.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <CheckCircle2 size={16} className="text-[#0EA5A0] flex-shrink-0 mt-0.5" />
                          <span style={{ color: "var(--text-primary)" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                      <Building2 size={13} />
                      <span className="line-clamp-1">{service.target}</span>
                    </div>
                    <Link
                      href="/contact"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-[#0B1F3A] hover:bg-[#0EA5A0] transition-colors duration-200"
                    >
                      Konsultasikan Layanan Ini
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
              title="3 Jalur Pemenuhan Produk"
              subtitle="Setiap produk kami tersedia melalui jalur yang paling sesuai — beli langsung, pesan kustom, atau pengadaan pihak ketiga dengan dukungan teknis."
              align="center"
            />
          </AnimatedElement>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {fulfillmentPaths.map((path) => {
              const Icon = path.icon;
              return (
                <AnimatedElement
                  key={path.title}
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
                      {path.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                      {path.description}
                    </p>
                    <ul className="space-y-2.5 mb-6">
                      {path.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-xs">
                          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: path.tone }} />
                          <span style={{ color: "var(--text-primary)" }}>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={path.cta.href}
                    target={path.cta.external ? "_blank" : undefined}
                    rel={path.cta.external ? "noopener noreferrer" : undefined}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: path.tone }}
                  >
                    {path.cta.label}
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
              title="Alur Pelaksanaan Layanan"
              subtitle="Metodologi terstruktur untuk menjamin setiap proyek pengerjaan dan instalasi berjalan tepat waktu dan sesuai spesifikasi."
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
                    {step.title}
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {step.desc}
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
              title="Pertanyaan Sering Diajukan (FAQ)"
              subtitle="Temukan jawaban cepat seputar komitmen kualitas, jaminan garansi, dan prosedur kerja layanan kami."
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
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between font-bold text-base gap-4"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp size={20} className="text-[#0EA5A0] flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      className="px-6 pb-6 text-sm leading-relaxed border-t pt-4"
                      style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {faq.answer}
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
              Butuh Konsultasi Layanan & Solusi Kustom?
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Tim engineer kami siap memberikan saran teknis, survey lokasi, dan penawaran harga terbaik untuk proyek laboratorium & industri Anda.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white shadow-xl hover:opacity-90 transition-all"
                style={{ backgroundColor: "#0EA5A0" }}
              >
                Hubungi Kami Sekarang
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
              >
                Lihat Katalog Produk
              </Link>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
