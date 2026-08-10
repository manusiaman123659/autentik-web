"use client";

import Link from "next/link";
import { Phone, ShoppingBag } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";

export default function CtaBanner() {
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
      }}
    >
      {/* Decorative elements */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #0EA5A0, transparent)" }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <AnimatedElement type="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
            Siap Mengintegrasikan Teknologi IoT Industri?
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            Hubungi tim teknis PT Autentik Karya Analitika untuk konsultasi perangkat IoT Quality Monitoring Devices dan solusi produk industri Anda.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              id="cta-contact-sales"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
              style={{ backgroundColor: "#0EA5A0" }}
            >
              <Phone size={18} />
              Hubungi Sales
            </Link>
            <Link
              href="/store"
              id="cta-open-marketplace"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md font-semibold text-white border-2 border-white/30 hover:border-white/70 hover:bg-white/10 transition-all duration-200"
            >
              <ShoppingBag size={18} />
              Buka Marketplace
            </Link>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

