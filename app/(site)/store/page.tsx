import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Phone, Wrench, PackageCheck, Cpu, Droplets, Wind, ShieldCheck } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

export const metadata: Metadata = {
  title: "Store Marketplace Sparepart | PT Autentik Karya Analitika",
  description:
    "Marketplace resmi sparepart dan komponen pengganti unit Talpha, Cylab, Ullun, dan Epal PT Autentik Karya Analitika — segera hadir. Hubungi tim sales untuk pemesanan.",
};

interface SparepartCategory {
  brand: string;
  categoryName: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  items: string[];
}

const sparepartCategories: SparepartCategory[] = [
  {
    brand: "Talpha",
    categoryName: "Sparepart & Sensor Talpha",
    description: "Kabel probe suhu, sensor kelembapan, modul GPS, dan power adapter pengganti unit TC-01/02/03 & Exinet.",
    icon: Wind,
    accentColor: "#F59E0B",
    items: ["Kabel Probe TC-03 (1m / 3m / 5m)", "Module Sensor Suhu RTD", "Power Adapter 12V Exinet", "Antena GPS Logistics Node"],
  },
  {
    brand: "Cylab",
    categoryName: "Filter & Cartridge Cylab",
    description: "Membran RO, Cartridge Deionisasi (DI), Lampu UV Sterilizer, dan filter sediment untuk Water Purification System.",
    icon: Droplets,
    accentColor: "#0EA5E9",
    items: ["Membran RO 50/100/200 GPD", "Ultra Pure DI Cartridge Pack", "Lampu Sterilisasi UV 254nm", "Filter Pre-Treatment 5 Micron"],
  },
  {
    brand: "Ullun",
    categoryName: "Komponen Furnitur Lab Ullun",
    description: "Filter HEPA/ULPA, blower fan, kaca temper Biosafety Cabinet, ducting, dan katup lemari asam.",
    icon: ShieldCheck,
    accentColor: "#EF4444",
    items: ["Filter HEPA H14 (Eff. 99.995%)", "Blower Motor Centrifugal", "Sash Glass Counterweight Wire", "Sistem Katup Nozzle Lemari Asam"],
  },
  {
    brand: "Epal",
    categoryName: "Modul & Valve IPAL Epal",
    description: "Dosing pump, sensor pH/TSS online, selenoid valve, dan blower aerasi untuk WWT System.",
    icon: Cpu,
    accentColor: "#10B981",
    items: ["Dosing Pump Chemical 5L/h", "Probe Transmitter pH Online", "Solenoid Valve Auto Flush", "Blower Aerasi IPAL Industrial"],
  },
];

type Props = {
  searchParams: Promise<{ compatible?: string }>;
};

export default async function StorePage({ searchParams }: Props) {
  const { compatible } = await searchParams;

  return (
    <>
      {/* Hero */}
      <section
        className="py-28 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #0EA5A0, transparent)",
          }}
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimatedElement type="fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
              <ShoppingBag size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-medium text-slate-200 tracking-wide uppercase">
                Marketplace Sparepart Official
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Marketplace Sparepart Autentik{" "}
              <span style={{ color: "#14B8A6" }}>Segera Hadir</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              Kami sedang menyiapkan toko sparepart resmi untuk unit Talpha, Cylab, Ullun, dan Epal langsung dari website ini. Untuk saat ini, hubungi tim sales kami untuk pemesanan sparepart.
            </p>

            {/* Banner filter kompatibilitas jika diklik dari halaman detail katalog */}
            {compatible && (
              <div className="mb-8 p-4 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-200 text-sm font-medium flex items-center justify-center gap-2">
                <PackageCheck size={18} className="text-[#14B8A6]" />
                <span>Memilih sparepart kompatibel untuk produk: <strong className="text-white uppercase">{compatible.replace(/-/g, " ")}</strong></span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://wa.me/6281234567890?text=Halo,%20saya%20ingin%20memesan%20sparepart%20produk%20Autentik"
                target="_blank"
                rel="noopener noreferrer"
                id="store-whatsapp-cta"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: "#25D366" }}
              >
                <Phone size={18} />
                Pesan Sparepart via WhatsApp
              </a>
              <Link
                href="/contact"
                id="store-contact-sales"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg font-semibold text-white border border-white/30 hover:bg-white/10 transition-all"
              >
                Hubungi Tim Sales
              </Link>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* Preview Kategori Sparepart */}
      <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up" className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Kategori Sparepart & Komponen Pengganti
            </h2>
            <p className="max-w-2xl mx-auto text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
              Semua sparepart dijamin 100% original bergaransi resmi langsung dari pabrikan PT Autentik Karya Analitika.
            </p>
          </AnimatedElement>

          <AnimatedElement type="stagger" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sparepartCategories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <div
                  key={cat.brand}
                  className="border rounded-2xl p-7 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div>
                    {/* Header: Icon & Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${cat.accentColor}18` }}
                      >
                        <IconComp size={22} style={{ color: cat.accentColor }} />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {cat.brand} Original Parts
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                      {cat.categoryName}
                    </h3>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                      {cat.description}
                    </p>

                    {/* Sample Items list */}
                    <div className="space-y-2 mb-6 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contoh Sparepart Siap Pesan:</p>
                      <ul className="space-y-1.5">
                        {cat.items.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            <Wrench size={12} className="text-[#0EA5A0]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=Halo,%20saya%20ingin%20menanyakan%20sparepart%20${encodeURIComponent(cat.categoryName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 w-full"
                    style={{ backgroundColor: "#0B1F3A" }}
                  >
                    Tanya Stok & Harga {cat.brand} Parts →
                  </a>
                </div>
              );
            })}
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
