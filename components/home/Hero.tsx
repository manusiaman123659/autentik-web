"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ClipboardList, Factory, Sparkles } from "lucide-react";
import type { HeroSlideResolved } from "@/lib/public-data";
import RfqModal from "@/components/product/RfqModal";

export default function Hero({ slides }: { slides: HeroSlideResolved[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [rfqOpen, setRfqOpen] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-page-alt text-heading dark:bg-black min-h-[680px] lg:min-h-[820px] flex items-center pt-24 pb-16">
      {/* Background Slides with smooth fade */}
      {slides.map((slide, index) => (
        <div
          key={slide.key}
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105 pointer-events-none"
          }`}
        >
          {/* Dynamic Background Gradient from accentColor */}
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${slide.accentColor}22, var(--public-hero-end))`,
            }}
          />
          {/* Radial Light Glow */}
          <div
            className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${slide.accentColor}, transparent)`,
            }}
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
        {slides.map((slide, index) => {
          if (index !== currentSlide) return null;
          return (
            <div
              key={slide.key}
              className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center animate-in fade-in slide-in-from-bottom-8 duration-700"
            >
              {/* Left Column: Text Content */}
              <div className="lg:col-span-7">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-white/70 dark:bg-white/10 text-heading border border-base dark:border-white/20 backdrop-blur-md mb-6 shadow-sm">
                  <Sparkles size={14} style={{ color: slide.accentColor }} />
                  <span>{slide.badge}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-extrabold tracking-tight leading-[1.05] mb-6 [overflow-wrap:anywhere]">
                  {slide.productName}
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-body dark:text-slate-300 mb-10 leading-relaxed font-light max-w-xl">
                  {slide.subtitle}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                  {slide.ctaLink && (
                    <Link
                      href={slide.ctaLink}
                      className="inline-flex items-center justify-center bg-navy-900 text-white hover:bg-navy-800 dark:bg-white dark:text-navy-900 dark:hover:bg-slate-100 min-h-13 py-3 px-8 text-base rounded-full font-bold shadow-xl transition-all transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
                    >
                      {slide.ctaLabel}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setRfqOpen(true)}
                    className="inline-flex min-h-13 py-3 items-center justify-center gap-2 rounded-full border border-base dark:border-white/40 px-8 text-base font-bold text-heading transition-all hover:bg-white/50 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
                  >
                    <ClipboardList size={18} />
                    Request Quotation
                  </button>
                </div>
              </div>

              {/* Right Column: Product Image Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-md bg-white/70 dark:bg-white/5 border border-base dark:border-white/15 rounded-3xl p-6 backdrop-blur-xl shadow-2xl group dark:hover:border-white/30 transition-all duration-300">
                  <div className="relative w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden bg-white/90 flex items-center justify-center p-4">
                    {slide.productImage ? (
                      <Image
                        src={slide.productImage}
                        alt={slide.productName}
                        fill
                         sizes="(max-width: 480px) calc(100vw - 96px), 400px"
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        loading="eager"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#0EA5A0]">
                        <Factory size={88} strokeWidth={1.25} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-body">
                        {slide.isCompanyFallback ? "Profil Perusahaan" : "Portofolio Produk AKA"}
                      </span>
                      <h4 className="text-lg font-bold text-heading leading-tight break-words">
                        {slide.productName}
                      </h4>
                    </div>
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#0EA5A0]/20 border border-[#0EA5A0]/40 flex items-center justify-center text-teal-600 dark:text-teal-300">
                      <Factory size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Indicators / Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center space-x-3">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500 ${
                index === currentSlide
                  ? "w-8 h-2 bg-navy-900 dark:bg-white"
                  : "w-2.5 h-2.5 bg-slate-400 hover:bg-slate-600 dark:bg-white/40 dark:hover:bg-white/70"
              }`}
              aria-label={`Tampilkan slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : undefined}
            />
          ))}
        </div>
      )}
      <RfqModal isOpen={rfqOpen} onClose={() => setRfqOpen(false)} />
    </section>
  );
}
