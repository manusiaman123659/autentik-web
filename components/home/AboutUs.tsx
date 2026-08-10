"use client";

import AnimatedElement from "@/components/ui/ScrollAnimations";

export default function AboutUs() {
  return (
    <section className="py-24 px-8 lg:px-16" id="about" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <AnimatedElement type="fade-up">
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-0.5 w-6 bg-[#0EA5A0]" />
              <h4
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                ABOUT US
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
              PT Autentik <br />
              <span className="text-[#0EA5A0]">Karya Analitika</span>
            </h2>
          </div>

          <p
            className="text-lg mb-12 leading-relaxed font-light"
            style={{ color: "var(--text-secondary)" }}
          >
            Perusahaan teknologi pintar yang senantiasa berkomitmen untuk memberikan dan meningkatkan kepuasan pelanggan melalui produk dan layanan berkualitas prima.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-y-10 gap-x-8">
            <div>
              <h3
                className="text-4xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                10+
              </h3>
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Tahun <br /> Pengalaman
              </p>
            </div>

            <div>
              <h3
                className="text-4xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                100+
              </h3>
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Proyek Terselesaikan
              </p>
            </div>

            <div>
              <h3
                className="text-4xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                5+
              </h3>
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Brand Partner
              </p>
            </div>

            <div>
              <h3
                className="text-4xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                99%
              </h3>
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Kepuasan Pelanggan
              </p>
            </div>
          </div>
        </AnimatedElement>

        {/* Right Decorative Image */}
        <AnimatedElement type="fade-up">
          <div
            className="relative h-[500px] lg:h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl border"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}
