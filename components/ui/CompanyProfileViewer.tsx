"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  ZoomIn,
  ZoomOut,
  LayoutGrid,
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

export default function CompanyProfileViewer({
  manifest,
}: {
  manifest?: ComproManifestProp | null;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipPhase, setFlipPhase] = useState<"idle" | "flipping" | "settling">(
    "idle"
  );
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">(
    "forward"
  );
  const [zoom, setZoom] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [pageAspectRatio, setPageAspectRatio] = useState(16 / 9);

  const hasPdf = Boolean(manifest?.pdfUrl && manifest.pdfUrl.trim());
  const pdfUrl = manifest?.pdfUrl || PDF_DOWNLOAD_URL;
  const pdfFilename = manifest?.pdfFilename || "COMPRO-AKA-2026.pdf";
  const title = manifest?.title || "Company Profile AKA 2026";

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState("");
  const [pdfReady, setPdfReady] = useState(-1);
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);

  const pdfStageRef = useRef<HTMLDivElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasksRef = useRef<
    Map<number, { task: { cancel(): void; promise: Promise<void> }; canvas: HTMLCanvasElement }>
  >(new Map());
  const flipContainerRef = useRef<HTMLDivElement>(null);

  const slideTotal = hasPdf ? numPages : TOTAL_SLIDES;
  const slideLimit = slideTotal - 1;
  const progress = slideTotal > 0 ? (currentSlide + 1) / slideTotal : 0;

  /* ─── PDF Loading ─── */
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
        setIsFlipping(false);
        setFlipPhase("idle");
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
    const tasks = renderTasksRef.current;
    const cache = pdfCacheRef.current;
    return () => {
      tasks.forEach(({ task }) => task.cancel());
      tasks.clear();
      cache.clear();
      void pdfDoc?.cleanup().catch(() => {});
    };
  }, [pdfDoc]);

  /* ─── Detect PDF page aspect ratio ─── */
  useEffect(() => {
    if (!pdfDoc) return;
    pdfDoc
      .getPage(1)
      .then((page) => {
        const vp = page.getViewport({ scale: 1 });
        if (vp.width && vp.height) {
          setPageAspectRatio(vp.width / vp.height);
        }
      })
      .catch(() => {});
  }, [pdfDoc]);

  /* ─── Stage measurement ─── */
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
  }, [isFullscreen]);

  useEffect(() => {
    renderTasksRef.current.forEach(({ task }) => task.cancel());
    renderTasksRef.current.clear();
    pdfCacheRef.current.clear();
  }, [stageWidth, stageHeight, pageAspectRatio]);

  /* ─── Render PDF page to canvas (with caching) ─── */
  const renderPageToCanvas = useCallback(
    async (pageNumber: number): Promise<HTMLCanvasElement | null> => {
      if (!pdfDoc) return null;
      const cached = pdfCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const existing = renderTasksRef.current.get(pageNumber);
      if (existing) {
        existing.task.cancel();
        renderTasksRef.current.delete(pageNumber);
      }

      const page = await pdfDoc.getPage(pageNumber + 1);
      const baseVp = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = stageWidth > 0 ? stageWidth : 900;
      const cssH = stageHeight > 0 ? stageHeight : cssW / pageAspectRatio;
      const boxW = Math.floor(cssW * dpr);
      const boxH = Math.floor(cssH * dpr);
      const scale = Math.min(boxW / baseVp.width, boxH / baseVp.height);
      const vp = page.getViewport({ scale });
      const full = document.createElement("canvas");
      full.width = Math.floor(vp.width);
      full.height = Math.floor(vp.height);
      const fullCtx = full.getContext("2d");
      if (!fullCtx) return null;

      const renderTask = page.render({
        canvasContext: fullCtx,
        viewport: vp,
        canvas: full,
        background: "#ffffff",
      });
      renderTasksRef.current.set(pageNumber, { task: renderTask, canvas: full });

      try {
        await renderTask.promise;
      } finally {
        renderTasksRef.current.delete(pageNumber);
      }

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
    [pdfDoc, stageWidth, stageHeight, pageAspectRatio]
  );

  /* ─── Draw to a specific canvas element ─── */
  const drawToCanvas = useCallback(
    async (canvas: HTMLCanvasElement, pageNum: number) => {
      const src = await renderPageToCanvas(pageNum);
      if (src) {
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(src, 0, 0);
      }
    },
    [renderPageToCanvas]
  );

  /* ─── Draw current page (idle state) ─── */
  useEffect(() => {
    if (!hasPdf || !pdfDoc || numPages === 0 || isFlipping || flipPhase === "settling") return;
    let cancelled = false;
    (async () => {
      try {
        const display = frontCanvasRef.current;
        if (!display) return;
        await drawToCanvas(display, currentSlide);
        if (cancelled) return;
        setPdfReady(currentSlide);
        if (currentSlide + 1 < numPages) {
          void renderPageToCanvas(currentSlide + 1).catch(() => {});
        }
      } catch {
        /* keep previous */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasPdf,
    pdfDoc,
    numPages,
    currentSlide,
    isFlipping,
    flipPhase,
    drawToCanvas,
    renderPageToCanvas,
  ]);

  /* ─── Flip animation completion ─── */
  const handleFlipEnd = useCallback(() => {
    if (flipPhase !== "flipping") return;
    const next =
      flipDirection === "forward"
        ? Math.min(currentSlide + 1, slideLimit)
        : Math.max(currentSlide - 1, 0);
    setFlipPhase("settling");
    setCurrentSlide(next);
  }, [flipPhase, flipDirection, currentSlide, slideLimit]);

  /* ─── Draw canvases during flip ─── */
  useEffect(() => {
    if (flipPhase === "idle" || !hasPdf || !pdfDoc || numPages === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const front = frontCanvasRef.current;
        const back = backCanvasRef.current;
        if (flipPhase === "flipping") {
          if (flipDirection === "forward") {
            if (front) await drawToCanvas(front, currentSlide);
            if (!cancelled && back && currentSlide + 1 < numPages)
              await drawToCanvas(back, currentSlide + 1);
          } else {
            if (front && currentSlide - 1 >= 0)
              await drawToCanvas(front, currentSlide - 1);
            if (!cancelled && back) await drawToCanvas(back, currentSlide);
          }
        } else if (flipPhase === "settling") {
          if (front) await drawToCanvas(front, currentSlide);
          setFlipPhase("idle");
          setIsFlipping(false);
        }
      } catch {
        setFlipPhase("idle");
        setIsFlipping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    flipPhase,
    flipDirection,
    hasPdf,
    pdfDoc,
    numPages,
    currentSlide,
    drawToCanvas,
  ]);

  /* ─── Fullscreen browser API ─── */
  useEffect(() => {
    function onFsChange() {
      const fsEl = document.fullscreenElement;
      if (!fsEl) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement
        .requestFullscreen()
        .catch(() => setIsFullscreen(false));
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isFullscreen]);

  /* ─── Preload adjacent fallback slides ─── */
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

  /* ─── Navigation ─── */
  const goToSlide = useCallback(
    (index: number) => {
      if (
        index < 0 ||
        index > slideLimit ||
        index === currentSlide ||
        flipPhase !== "idle"
      )
        return;
      if (hasPdf && pdfDoc) {
        setFlipDirection(index > currentSlide ? "forward" : "backward");
        setFlipPhase("flipping");
        setIsFlipping(true);
      } else {
        setIsImageLoading(true);
        setCurrentSlide(index);
      }
    },
    [currentSlide, slideLimit, flipPhase, hasPdf, pdfDoc]
  );

  const handleNext = useCallback(() => {
    if (currentSlide < slideLimit) goToSlide(currentSlide + 1);
  }, [currentSlide, slideLimit, goToSlide]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  /* ─── Touch swipe ─── */
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return;
      const diff = touchStartRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) handleNext();
        else handlePrev();
      }
      touchStartRef.current = null;
    },
    [handleNext, handlePrev]
  );

  /* ─── Keyboard navigation ─── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "g" || e.key === "G") {
        if (isFullscreen) {
          e.preventDefault();
          setShowThumbnails((p) => !p);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  /* ─── Thumbnail page rendering ─── */
  const renderThumbPage = useCallback(
    async (canvas: HTMLCanvasElement, pageNum: number) => {
      if (!pdfDoc) return;
      const existing = renderTasksRef.current.get(pageNum);
      if (existing) {
        existing.task.cancel();
        renderTasksRef.current.delete(pageNum);
      }
      const page = await pdfDoc.getPage(pageNum + 1);
      const baseVp = page.getViewport({ scale: 1 });
      const thumbW = 160;
      const scale = thumbW / baseVp.width;
      const vp = page.getViewport({ scale });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const renderTask = page.render({
        canvasContext: ctx,
        viewport: vp,
        canvas,
        background: "#ffffff",
      });
      renderTasksRef.current.set(pageNum, { task: renderTask, canvas });
      try {
        await renderTask.promise;
      } finally {
        renderTasksRef.current.delete(pageNum);
      }
    },
    [pdfDoc]
  );

  /* ────────────────────── RENDER ────────────────────── */

  const bookContent = hasPdf && pdfDoc;
  const showFlipbook = bookContent && !pdfError;

  /* Shared stage content (arrows + flipbook / loading / error / fallback) */
  const stageContent = (
    <>
      {/* Navigation Arrows — floating outside the book */}
      <button
        onClick={handlePrev}
        disabled={currentSlide === 0 || isFlipping}
        className={`absolute left-2 sm:left-6 z-[40] pointer-events-auto p-3 rounded-full backdrop-blur transition-all shadow-lg focus:outline-none ${
          isFullscreen
            ? "bg-black/40 hover:bg-black/70 text-white"
            : "bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/15 backdrop-blur-md"
        } ${
          currentSlide === 0 || isFlipping
            ? "opacity-20 cursor-not-allowed"
            : "hover:scale-110"
        }`}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={isFullscreen ? 28 : 22} />
      </button>
      <button
        onClick={handleNext}
        disabled={currentSlide >= slideLimit || isFlipping}
        className={`absolute right-2 sm:right-6 z-[40] pointer-events-auto p-3 rounded-full backdrop-blur transition-all shadow-lg focus:outline-none ${
          isFullscreen
            ? "bg-black/40 hover:bg-black/70 text-white"
            : "bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/15 backdrop-blur-md"
        } ${
          currentSlide >= slideLimit || isFlipping
            ? "opacity-20 cursor-not-allowed"
            : "hover:scale-110"
        }`}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={isFullscreen ? 28 : 22} />
      </button>

      {/* ─── Flipbook ─── */}
      {showFlipbook ? (
        <div
          className={`relative ${
            isFullscreen
              ? "w-full max-w-[95vw] max-h-[calc(100vh-140px)]"
              : ""
          }`}
          style={{
            perspective: "1200px",
            width: isFullscreen ? undefined : "88%",
            aspectRatio: isFullscreen ? pageAspectRatio : undefined,
          }}
        >
          {/* Book wrapper with stacked-page edge shadows */}
          <div
            className="relative bg-white"
            style={{
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.5), 4px 0 0 -1px #e2e8f0, 5px 0 0 -1px #cbd5e1, 8px 0 0 -2px #e2e8f0, 9px 0 0 -2px #94a3b8",
              borderRadius: "2px",
            }}
          >
            <div
              ref={flipContainerRef}
              className="relative w-full"
              style={{
                aspectRatio: `${pageAspectRatio}`,
                transformStyle: "preserve-3d",
                transform:
                  flipPhase === "flipping"
                    ? `scale(${zoom}) rotateY(${flipDirection === "forward" ? "-180deg" : "0deg"})`
                    : flipPhase === "settling"
                      ? `scale(${zoom}) rotateY(${flipDirection === "forward" ? "-180deg" : "0deg"})`
                      : `scale(${zoom}) rotateY(${flipDirection === "backward" ? "-180deg" : "0deg"})`,
                transition:
                  flipPhase === "flipping"
                    ? "transform 0.6s ease-in-out"
                    : "none",
              }}
              onTransitionEnd={
                flipPhase === "flipping" ? handleFlipEnd : undefined
              }
            >
              {/* Front page */}
              <div
                className="absolute inset-0 rounded-sm overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  boxShadow: isFullscreen
                    ? "2px 0 3px rgba(0,0,0,0.2), 4px 0 5px rgba(0,0,0,0.15), 6px 0 7px rgba(0,0,0,0.1), 8px 0 9px rgba(0,0,0,0.07), inset -4px 0 8px -3px rgba(0,0,0,0.3)"
                    : "1px 0 2px rgba(0,0,0,0.15), 2px 0 3px rgba(0,0,0,0.12), 3px 0 4px rgba(0,0,0,0.09), inset -3px 0 6px -2px rgba(0,0,0,0.25)",
                  background: "white",
                  zIndex: isFlipping && flipDirection === "backward" ? 20 : 10,
                }}
              >
                <canvas
                  ref={frontCanvasRef}
                  className="block w-full h-full"
                  style={{ display: "block" }}
                />
                {pdfReady !== currentSlide && !isFlipping && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
                  </div>
                )}
              </div>

              {/* Back page (visible during flip) */}
              <div
                className="absolute inset-0 rounded-sm overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  boxShadow:
                    "2px 0 3px rgba(0,0,0,0.2), 4px 0 5px rgba(0,0,0,0.15), inset -4px 0 8px -3px rgba(0,0,0,0.3)",
                  background: "white",
                  zIndex: isFlipping && flipDirection === "forward" ? 20 : 5,
                }}
              >
                <canvas
                  ref={backCanvasRef}
                  className="block w-full h-full"
                  style={{ display: "block" }}
                />
              </div>
            </div>

            {/* Spine crease overlay — book fold effect on left edge */}
            <div className="absolute inset-y-0 left-0 w-20 pointer-events-none bg-gradient-to-r from-black/30 via-black/10 to-transparent z-10" />
          </div>
        </div>
      ) : hasPdf && !pdfError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-3 border-[#0EA5A0]/30 border-t-[#0EA5A0] rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Memuat dokumen…</p>
        </div>
      ) : pdfError ? (
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
      ) : (
        /* Fallback: Static Slide Image */
        <div
          className={`relative w-full h-full ${
            isFullscreen ? "max-w-[90vw] max-h-[82vh] mx-auto" : ""
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
            className={`${
              isFullscreen
                ? "max-h-[82vh] max-w-[90vw] w-auto h-auto object-contain rounded-sm shadow-2xl"
                : "object-contain"
            }`}
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
    </>
  );

  return (
    <div className="relative flex flex-col select-none">
      {/* ─── Embed Mode: Top Controls Bar ─── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-white/60 text-xs sm:text-sm font-mono tracking-wide shrink-0">
            <span className="text-[#0EA5A0] font-bold">
              {String(currentSlide + 1).padStart(2, "0")}
            </span>
            <span className="mx-1">/</span>
            <span>
              {slideTotal > 0 ? String(slideTotal).padStart(2, "0") : "--"}
            </span>
          </span>
          <span className="text-white/20 hidden sm:inline">|</span>
          <span
            className="text-white/70 text-xs sm:text-sm font-medium truncate"
            title={title}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href={pdfUrl}
            download={pdfFilename}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 backdrop-blur transition-all"
            title="Download PDF"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* ─── Embed Mode: Progress Bar ─── */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-[#0EA5A0] to-[#0cbaaf] transition-all duration-400 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* ─── Embed Mode: Stage ─── */}
      <div
        ref={pdfStageRef}
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: "#0a1628",
          aspectRatio: "16 / 9",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {stageContent}
      </div>

      {/* ─── Embed Mode: Bottom Bar ─── */}
      <div className="flex items-center justify-center px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#050d1a] to-[#0B1F3A] rounded-b-2xl">
        <p className="text-slate-300 dark:text-slate-400 text-xs font-light">
          Gunakan panah ◀ ▶ atau geser untuk navigasi
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FULLSCREEN MODE — via Portal (bypasses stacking context) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] w-screen h-screen bg-neutral-950 flex flex-col overflow-hidden">
            {/* Top Header */}
            <div className="w-full bg-neutral-900/90 backdrop-blur border-b border-neutral-800 py-2.5 sm:py-3 px-3 sm:px-6 flex items-center gap-2 text-white z-20 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-xs sm:text-sm">
                <span className="text-white/50 font-medium shrink-0">
                  Company Profile | Autentik
                </span>
                <span className="text-white/20 hidden sm:inline">|</span>
                <span className="text-white/70 font-mono truncate">
                  Halaman{" "}
                  <span className="text-[#0EA5A0] font-bold">
                    {currentSlide + 1}
                  </span>{" "}
                  dari <span>{slideTotal || "--"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={pdfUrl}
                  download={pdfFilename}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Download PDF"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Exit Fullscreen (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Fullscreen progress bar */}
            <div className="h-1 w-full bg-white/5 shrink-0">
              <div
                className="h-full bg-gradient-to-r from-[#0EA5A0] to-[#0cbaaf] transition-all duration-400 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Fullscreen Stage */}
            <div
              ref={pdfStageRef}
              className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "#0a0a0a" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {stageContent}
            </div>

            {/* Bottom floating pill toolbar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur border border-neutral-700/60 rounded-full px-5 py-2 flex items-center gap-4 text-white shadow-2xl z-20 shrink-0">
              <button
                onClick={() => setShowThumbnails((p) => !p)}
                className={`p-2 rounded-lg transition-all ${
                  showThumbnails
                    ? "text-[#0EA5A0] bg-[#0EA5A0]/10"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="Thumbnail Grid (G)"
              >
                <LayoutGrid size={18} />
              </button>

              <div className="w-px h-5 bg-white/10" />

              <button
                onClick={handlePrev}
                disabled={currentSlide === 0 || isFlipping}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-white/50 text-xs font-mono min-w-[4rem] text-center">
                {slideTotal > 0
                  ? `${currentSlide + 1} / ${slideTotal}`
                  : "-- / --"}
              </span>
              <button
                onClick={handleNext}
                disabled={currentSlide >= slideLimit || isFlipping}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>

              <div className="w-px h-5 bg-white/10" />

              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/50 text-xs font-mono min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ZoomIn size={18} />
              </button>

              <div className="w-px h-5 bg-white/10" />

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                title="Exit Fullscreen"
              >
                <Minimize2 size={18} />
              </button>
            </div>

            {/* Thumbnail grid overlay */}
            {showThumbnails && (
              <div
                className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex flex-col items-center pt-16 pb-20 overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowThumbnails(false);
                }}
              >
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-6 max-w-5xl w-full">
                  {Array.from({ length: slideTotal }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        goToSlide(i);
                        setShowThumbnails(false);
                      }}
                      className={`relative aspect-[16/9] rounded overflow-hidden border-2 transition-all group ${
                        i === currentSlide
                          ? "border-[#0EA5A0] ring-2 ring-[#0EA5A0]/50"
                          : "border-white/10 hover:border-white/40"
                      }`}
                    >
                      {bookContent ? (
                        <ThumbCanvas
                          pageNum={i}
                          isActive={Math.abs(i - currentSlide) <= 5}
                          renderPage={renderThumbPage}
                        />
                      ) : (
                        <Image
                          src={getSlideUrl(i)}
                          alt={`Slide ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[9px] text-white/70 font-mono bg-black/50 px-1 rounded">
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─── Thumbnail Canvas (lazy rendered) ─── */
function ThumbCanvas({
  pageNum,
  isActive,
  renderPage,
}: {
  pageNum: number;
  isActive: boolean;
  renderPage: (canvas: HTMLCanvasElement, pageNum: number) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!isActive || rendered) return;
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      await renderPage(canvas, pageNum);
      if (!cancelled) setRendered(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, rendered, pageNum, renderPage]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ display: "block" }}
    />
  );
}
