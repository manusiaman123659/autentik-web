"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  X,
  FileText,
} from "lucide-react";

const TOTAL_SLIDES = 40;
const PDF_DOWNLOAD_URL = "/images/compro/COMPRO-AKA-2026.pdf";
const PAGE_CACHE_LIMIT = 6;

function getSlideUrl(index: number) {
  return `/images/compro/slide-${index + 1}.jpg`;
}

export interface ComproManifestProp {
  title?: string;
  pdfUrl?: string;
  pdfFilename?: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component — Horizontal slide viewer (one full page at a time) */
/* ------------------------------------------------------------------ */
export default function CompanyProfileViewer({
  manifest,
}: {
  manifest?: ComproManifestProp | null;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const hasPdf = Boolean(manifest?.pdfUrl && manifest.pdfUrl.trim());
  const pdfUrl = manifest?.pdfUrl || PDF_DOWNLOAD_URL;
  const pdfFilename = manifest?.pdfFilename || "COMPRO-AKA-2026.pdf";
  const title = manifest?.title || "Company Profile AKA 2026";

  // --- PDF state ---
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState("");
  const [pdfReady, setPdfReady] = useState(-1);
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);


  const pdfStageRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const slideTotal = hasPdf ? numPages : TOTAL_SLIDES;
  const slideLimit = slideTotal - 1;
  const progress = slideTotal > 0 ? (currentSlide + 1) / slideTotal : 0;

  // Load the PDF document
  useEffect(() => {
    if (!hasPdf) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
        }
        pdfCacheRef.current.clear();
        setNumPages(0);
        setPdfError("");
        setPdfReady(-1);
        setCurrentSlide(0);
        setPdfDoc((prev) => {
          if (prev) void prev.cleanup().catch(() => {});
          return null;
        });
        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        if (cancelled) {
          void doc.cleanup();
          return;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch {
        if (!cancelled) setPdfError("Gagal memuat file PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPdf, pdfUrl]);

  useEffect(() => {
    return () => {
      void pdfDoc?.cleanup().catch(() => {});
    };
  }, [pdfDoc]);

  // Measure stage width AND height
  useEffect(() => {
    const el = pdfStageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setStageWidth(rect.width);
        setStageHeight(rect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drop cached page bitmaps when the stage size changes so the cover-crop
  // re-renders at the correct box dimensions (e.g. fullscreen toggle).
  useEffect(() => {
    pdfCacheRef.current.clear();
  }, [stageWidth, stageHeight]);

  // Navigation
  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index > slideLimit || index === currentSlide) return;
      setIsImageLoading(true);
      setCurrentSlide(index);
    },
    [currentSlide, slideLimit]
  );

  const goNext = useCallback(() => {
    if (currentSlide < slideLimit) goToSlide(currentSlide + 1);
  }, [currentSlide, slideLimit, goToSlide]);

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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, isFullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isFullscreen]);

  // Preload adjacent fallback slides
  useEffect(() => {
    if (hasPdf) return;
    const preload = [currentSlide - 1, currentSlide + 1].filter(
      (i) => i >= 0 && i < TOTAL_SLIDES
    );
    preload.forEach((i) => {
      const img = new window.Image();
      img.src = getSlideUrl(i);
    });
  }, [currentSlide, hasPdf]);

  // Render PDF page to canvas with caching.
  // Fill the landscape 16:9 container (cover): portrait pages fill the whole
  // box and only the top/bottom margins are cropped, centered.
  const renderPageToCanvas = useCallback(
    async (pageNumber: number): Promise<HTMLCanvasElement | null> => {
      if (!pdfDoc) return null;
      const cached = pdfCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const page = await pdfDoc.getPage(pageNumber + 1); // pdfjs is 1-indexed
      const baseVp = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = stageWidth > 0 ? stageWidth : 900;
      const cssH = stageHeight > 0 ? stageHeight : cssW * (9 / 16);
      const boxW = Math.floor(cssW * dpr);
      const boxH = Math.floor(cssH * dpr);
      // Cover the box: pick the larger scale so the page fills it entirely
      const scale = Math.max(boxW / baseVp.width, boxH / baseVp.height);
      const vp = page.getViewport({ scale });
      const full = document.createElement("canvas");
      full.width = Math.floor(vp.width);
      full.height = Math.floor(vp.height);
      const fullCtx = full.getContext("2d");
      if (!fullCtx) return null;
      await page
        .render({
          canvasContext: fullCtx,
          viewport: vp,
          canvas: full,
          background: "#ffffff",
        })
        .promise;

      // Center-crop the full-page render onto the 16:9 box
      const out = document.createElement("canvas");
      out.width = boxW;
      out.height = boxH;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      const sx = Math.max(0, (full.width - boxW) / 2);
      const sy = Math.max(0, (full.height - boxH) / 2);
      ctx.drawImage(
        full,
        sx,
        sy,
        Math.min(boxW, full.width),
        Math.min(boxH, full.height),
        0,
        0,
        boxW,
        boxH
      );

      pdfCacheRef.current.set(pageNumber, out);
      if (pdfCacheRef.current.size > PAGE_CACHE_LIMIT) {
        const first = pdfCacheRef.current.keys().next().value;
        if (first != null) pdfCacheRef.current.delete(first);
      }
      return out;
    },
    [pdfDoc, stageWidth, stageHeight]
  );

  // Draw current PDF page & pre-render next
  useEffect(() => {
    if (!hasPdf || !pdfDoc || numPages === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const display = mainCanvasRef.current;
        const src = await renderPageToCanvas(currentSlide);
        if (cancelled) return;
        if (display && src) {
          display.width = src.width;
          display.height = src.height;
          const ctx = display.getContext("2d");
          if (ctx) ctx.drawImage(src, 0, 0);
        }
        setPdfReady(currentSlide);
        // Pre-render next page
        if (currentSlide + 1 < numPages) {
          void renderPageToCanvas(currentSlide + 1).catch(() => {});
        }
      } catch {
        // keep previous page visible
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPdf, pdfDoc, numPages, currentSlide, renderPageToCanvas]);

  // Touch swipe support
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return;
      const diff = touchStartRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
      touchStartRef.current = null;
    },
    [goNext, goPrev]
  );

  /* ─────────── Always use landscape 16:9 container ─────────── */

  return (
    <div
      className={`relative flex flex-col select-none ${
        isFullscreen
          ? "fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl"
          : ""
      }`}
    >
      {/* ─── Top Controls Bar ─── */}
      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-3 ${
          isFullscreen
            ? "bg-black/70 backdrop-blur-md border-b border-white/10"
            : "bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-t-2xl"
        }`}
      >
        {/* Page Counter */}
        <span className="text-white/60 text-xs sm:text-sm font-mono tracking-wide flex-shrink-0">
          <span className="text-[#0EA5A0] font-bold">
            {String(currentSlide + 1).padStart(2, "0")}
          </span>
          <span className="mx-1.5">/</span>
          <span>
            {slideTotal > 0 ? String(slideTotal).padStart(2, "0") : "--"}
          </span>
        </span>

        {/* Title */}
        <h3
          className={`text-white font-semibold tracking-wide truncate px-3 flex items-center gap-2 ${
            isFullscreen ? "text-base sm:text-lg" : "text-xs sm:text-sm"
          }`}
        >
          <FileText size={14} className="text-[#0EA5A0] flex-shrink-0" />
          {title}
        </h3>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={pdfUrl}
            download={pdfFilename}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-[#0EA5A0]/20 hover:bg-[#0EA5A0]/40 border border-[#0EA5A0]/30 transition-all duration-200 hover:scale-[1.03]"
            title="Download PDF"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
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

      {/* ─── Progress Bar ─── */}
      <div className={`h-1 ${isFullscreen ? "bg-white/5" : "bg-slate-800"}`}>
        <div
          className="h-full bg-gradient-to-r from-[#0EA5A0] to-[#0cbaaf] transition-all duration-400 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* ─── Main Slide Area ─── */}
      <div
        ref={pdfStageRef}
        className={`relative flex items-center justify-center overflow-hidden ${
          isFullscreen ? "flex-1" : ""
        }`}
        style={{
          backgroundColor: "#0a1628",
          // Always landscape 16:9 — PDF pages (even portrait) fit inside
          aspectRatio: isFullscreen ? undefined : "16 / 9",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
          disabled={currentSlide >= slideLimit}
          className={`absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full transition-all duration-300 ${
            currentSlide >= slideLimit
              ? "opacity-20 cursor-not-allowed"
              : "bg-black/40 hover:bg-black/70 text-white hover:scale-110 backdrop-blur-sm shadow-lg border border-white/10"
          }`}
          aria-label="Next slide"
        >
          <ChevronRight size={isFullscreen ? 28 : 22} />
        </button>

        {/* Slide Content */}
        {pdfError ? (
          <div className="text-center px-6 py-16">
            <AlertCircle size={36} className="mx-auto text-white/30 mb-4" />
            <p className="text-white/60 text-sm mb-5">{pdfError}</p>
            <a
              href={pdfUrl}
              download={pdfFilename}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#0EA5A0] hover:bg-[#0d9490] transition-colors shadow-lg"
            >
              <Download size={16} />
              Download PDF Langsung
            </a>
          </div>
        ) : hasPdf && pdfDoc ? (
          /* ─── PDF Canvas ─── */
          <div className="w-full h-full flex items-center justify-center p-2">
            <canvas
              ref={mainCanvasRef}
              className="block w-full h-full"
              style={{ display: "block" }}
            />
            {/* Loading shimmer */}
            {pdfReady !== currentSlide && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
              </div>
            )}
          </div>
        ) : hasPdf && !pdfError ? (
          /* ─── Loading ─── */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-3 border-[#0EA5A0]/30 border-t-[#0EA5A0] rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Memuat dokumen…</p>
          </div>
        ) : (
          /* ─── Fallback: Static Slide Image ─── */
          <div
            className={`relative w-full h-full ${
              isFullscreen ? "max-w-[90vw] max-h-[80vh] mx-auto" : ""
            }`}
          >
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
        )}
      </div>

      {/* ─── Bottom Bar ─── */}
      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-2.5 ${
          isFullscreen
            ? "bg-black/60 border-t border-white/10"
            : "bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-b-2xl"
        }`}
      >
        <p className="text-white/40 text-[10px] sm:text-xs font-light">
          Gunakan panah ◀ ▶ atau geser untuk navigasi
        </p>
        <a
          href={pdfUrl}
          download={pdfFilename}
          className="flex items-center gap-1.5 text-[#0EA5A0] hover:text-[#0cbaaf] text-[10px] sm:text-xs font-medium transition-colors"
        >
          <Download size={12} />
          {pdfFilename}
        </a>
      </div>
    </div>
  );
}