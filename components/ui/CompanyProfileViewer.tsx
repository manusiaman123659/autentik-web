"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

const TOTAL_SLIDES = 40;
const PDF_DOWNLOAD_URL = "/images/compro/COMPRO-AKA-2026.pdf";

function getSlideUrl(index: number) {
  return `/images/compro/slide-${index + 1}.jpg`;
}

export default function CompanyProfileViewer() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOTAL_SLIDES || index === currentSlide) return;
      setDirection(index > currentSlide ? 1 : -1);
      setIsImageLoading(true);
      setCurrentSlide(index);
    },
    [currentSlide]
  );

  const goNext = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }

    if (isFullscreen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [goNext, goPrev, isFullscreen]);

  // Auto-scroll thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const thumb = thumbnailContainerRef.current.children[
        currentSlide
      ] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentSlide]);

  // Preload adjacent slides
  useEffect(() => {
    const preload = [currentSlide - 1, currentSlide + 1].filter(
      (i) => i >= 0 && i < TOTAL_SLIDES
    );
    preload.forEach((i) => {
      const img = new window.Image();
      img.src = getSlideUrl(i);
    });
  }, [currentSlide]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const SlideViewer = (
    <div
      ref={viewerRef}
      className={`relative flex flex-col ${
        isFullscreen
          ? "fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl"
          : ""
      }`}
    >
      {/* Top Controls Bar */}
      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-3 ${
          isFullscreen
            ? "bg-black/60 border-b border-white/10"
            : "bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-t-2xl"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-xs sm:text-sm font-mono tracking-wide">
            <span className="text-[#0EA5A0] font-bold">
              {String(currentSlide + 1).padStart(2, "0")}
            </span>
            <span className="mx-1.5">/</span>
            <span>{String(TOTAL_SLIDES).padStart(2, "0")}</span>
          </span>
        </div>

        <h3
          className={`text-white font-semibold tracking-wide hidden sm:block ${
            isFullscreen ? "text-lg" : "text-sm"
          }`}
        >
          Company Profile AKA 2026
        </h3>

        <div className="flex items-center gap-2">
          <a
            href={PDF_DOWNLOAD_URL}
            download="COMPRO-AKA-2026.pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-[#0EA5A0]/20 hover:bg-[#0EA5A0]/40 border border-[#0EA5A0]/30 transition-all duration-200 hover:scale-[1.03]"
            title="Download PDF"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download PDF</span>
          </a>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Area */}
      <div
        className={`relative flex-1 flex items-center justify-center overflow-hidden ${
          isFullscreen ? "px-4 sm:px-16 py-4" : ""
        }`}
        style={{
          backgroundColor: isFullscreen ? "transparent" : "#0a1628",
          aspectRatio: isFullscreen ? undefined : "16 / 9",
          minHeight: isFullscreen ? undefined : "auto",
        }}
      >
        {/* Navigation Arrows */}
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className={`absolute left-2 sm:left-4 z-20 p-2 sm:p-3 rounded-full transition-all duration-300 ${
            currentSlide === 0
              ? "opacity-20 cursor-not-allowed"
              : "bg-black/40 hover:bg-black/70 text-white hover:scale-110 backdrop-blur-sm shadow-lg border border-white/10"
          }`}
          aria-label="Previous slide"
        >
          <ChevronLeft size={isFullscreen ? 28 : 22} />
        </button>
        <button
          onClick={goNext}
          disabled={currentSlide === TOTAL_SLIDES - 1}
          className={`absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full transition-all duration-300 ${
            currentSlide === TOTAL_SLIDES - 1
              ? "opacity-20 cursor-not-allowed"
              : "bg-black/40 hover:bg-black/70 text-white hover:scale-110 backdrop-blur-sm shadow-lg border border-white/10"
          }`}
          aria-label="Next slide"
        >
          <ChevronRight size={isFullscreen ? 28 : 22} />
        </button>

        {/* Slide Image */}
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`w-full h-full flex items-center justify-center ${
              isFullscreen ? "max-w-[90vw] max-h-[75vh] mx-auto" : ""
            }`}
          >
            <div className="relative w-full h-full">
              {/* Loading shimmer */}
              {isImageLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-lg" />
                </div>
              )}
              <Image
                src={getSlideUrl(currentSlide)}
                alt={`Company Profile Slide ${currentSlide + 1}`}
                fill
                className="object-contain"
                priority={currentSlide === 0}
                sizes={
                  isFullscreen
                    ? "90vw"
                    : "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1100px"
                }
                onLoad={() => setIsImageLoading(false)}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div
        className={`h-1 ${isFullscreen ? "bg-white/5" : "bg-slate-800"}`}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-[#0EA5A0] to-[#0cbaaf]"
          initial={false}
          animate={{
            width: `${((currentSlide + 1) / TOTAL_SLIDES) * 100}%`,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {/* Thumbnail Strip */}
      <div
        className={`${
          isFullscreen
            ? "bg-black/60 border-t border-white/10 px-4 py-3"
            : "bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-b-2xl px-4 py-3"
        }`}
      >
        <div
          ref={thumbnailContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 pb-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                currentSlide === i
                  ? "border-[#0EA5A0] shadow-[0_0_12px_rgba(14,165,160,0.4)] scale-105"
                  : "border-transparent hover:border-white/30 opacity-60 hover:opacity-100"
              }`}
              style={{
                width: isFullscreen ? 80 : 64,
                height: isFullscreen ? 45 : 36,
              }}
              title={`Slide ${i + 1}`}
              aria-label={`Go to slide ${i + 1}`}
            >
              <Image
                src={getSlideUrl(i)}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              {currentSlide === i && (
                <div className="absolute inset-0 bg-[#0EA5A0]/10" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return SlideViewer;
}
