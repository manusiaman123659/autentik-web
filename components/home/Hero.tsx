"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const heroSlides = [
  {
    badge: "Produk Unggulan",
    titlePart1: "TALPHA",
    titleHighlight: "Smart Air Quality",
    titlePart2: "Monitoring System",
    subtitle: "SMART AIR QUALITY MONITORING SYSTEM berbasis IoT untuk pemantauan lingkungan real-time.",
    ctaLink: "/katalog-produk/talpha-exinet-now",
    productName: "TALPHA EXINET NOW",
    productImage: "/images/products/talpha-3_TALPHA EXYNET NOW.jpg",
    bgGradient: "from-[#050d1a] via-[#0B1F3A] to-[#0e2a4d]",
    accentColor: "#F59E0B",
  },
  {
    badge: "Solusi Laboratorium",
    titlePart1: "CYLAB",
    titleHighlight: "Water Purification",
    titlePart2: "System",
    subtitle: "Water Purification System (WPS-LS1012) berbasis IoT untuk kebutuhan air laboratorium analitik.",
    ctaLink: "/katalog-produk/cylab-wps-ls1012",
    productName: "CYLAB WPS LS1012",
    productImage: "/images/products/cylab-1_CYLAB WPS LS1012.jpg",
    bgGradient: "from-[#041226] via-[#082347] to-[#0b3366]",
    accentColor: "#0EA5E9",
  },
  {
    badge: "Produk Autentik",
    titlePart1: "AUTENTIK",
    titleHighlight: "Auto Dry",
    titlePart2: "Desiccator Cabinet",
    subtitle: "Auto Dry Desiccator Cabinet (ADC-80) dengan pemantauan suhu dan kelembaban digital presisi.",
    ctaLink: "/katalog-produk/autentik-adc-80",
    productName: "AUTENTIK DRY CABINET 80L",
    productImage: "/images/products/autentik-1_AUTENTIK DRY CABINET 80 L.png",
    bgGradient: "from-[#031518] via-[#072f33] to-[#0b484d]",
    accentColor: "#0EA5A0",
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-black text-white min-h-[680px] lg:min-h-[820px] flex items-center pt-24 pb-16">
      {/* Background Slides with smooth fade */}
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
          }`}
        >
          {/* Subtle Dark Background Gradient */}
          <div className={`w-full h-full bg-gradient-to-br ${slide.bgGradient}`} />
          {/* Radial Light Glow */}
          <div
            className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: `radial-gradient(circle, ${slide.accentColor}, transparent)` }}
          />
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
      ))}

      {/* Main Content Layout */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full">
        {heroSlides.map((slide, index) => {
          if (index !== currentSlide) return null;
          return (
            <div
              key={index}
              className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center animate-in fade-in slide-in-from-bottom-8 duration-700"
            >
              {/* Left Column: Text Content */}
              <div className="lg:col-span-7">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-white/10 text-white border border-white/20 backdrop-blur-md mb-6 shadow-sm">
                  <Sparkles size={14} style={{ color: slide.accentColor }} />
                  <span>{slide.badge}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-extrabold tracking-tight leading-[1.05] mb-6">
                  {slide.titlePart1} <br />
                  <span style={{ color: "#8ab4f8" }}>{slide.titleHighlight}</span> <br />
                  {slide.titlePart2}
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-300 mb-10 leading-relaxed font-light max-w-xl">
                  {slide.subtitle}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={slide.ctaLink}
                    className="inline-flex items-center justify-center bg-white text-[#0B1F3A] hover:bg-slate-100 h-13 px-8 text-base rounded-full font-bold shadow-xl transition-all transform hover:-translate-y-0.5"
                  >
                    Lihat Produk
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center border border-white/40 text-white hover:bg-white/10 h-13 px-8 text-base rounded-full font-bold transition-all"
                  >
                    Hubungi Kami
                  </Link>
                </div>
              </div>

              {/* Right Column: Actual Company Product Image Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-md bg-white/5 border border-white/15 rounded-3xl p-6 backdrop-blur-xl shadow-2xl group hover:border-white/30 transition-all duration-300">
                  <div className="relative w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden bg-white/90 flex items-center justify-center p-4">
                    <Image
                      src={slide.productImage}
                      alt={slide.productName}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      priority
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Produk Resmi PT Autentik
                      </span>
                      <h4 className="text-lg font-bold text-white leading-tight">
                        {slide.productName}
                      </h4>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#0EA5A0]/20 border border-[#0EA5A0]/40 flex items-center justify-center text-[#14B8A6]">
                      <ShieldCheck size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Indicators / Dots */}
      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center space-x-3">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
              index === currentSlide
                ? "w-8 h-2 bg-white"
                : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
