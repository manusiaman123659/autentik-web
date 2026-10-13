"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Box, X, Info } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import type { ProductPhotoHotspot } from "@/types";
import { computeContainedImageRect, type ImageRect } from "@/lib/photo-hotspot-utils";
import { useTranslations } from "next-intl";

// three.js is heavy — only load it when the visitor actually opens the "3D"
// tab, so the bundle is never fetched on pages that never show a viewer.
const Model3DViewer = dynamic(() => import("./Product3DViewer"), {
  ssr: false,
  loading: () => <ViewerLoading />,
});

function ViewerLoading() {
  return (
    <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
  );
}

interface ProductMediaTabsProps {
  name: string;
  brand?: string;
  imageUrl?: string;
  gallery?: string[];
  model3dUrl?: string;
  hotspots?: Hotspot[];
  photoHotspots?: ProductPhotoHotspot[];
}

interface Hotspot {
  id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  title: string;
  description: string | null;
}

export default function ProductMediaTabs({
  name,
  brand,
  imageUrl,
  gallery = [],
  model3dUrl,
  hotspots = [],
  photoHotspots = [],
}: ProductMediaTabsProps) {
  const t = useTranslations("products.media");
  const [tab, setTab] = useState<"foto" | "3d">("foto");
  const has3d = Boolean(model3dUrl);

  const allImages = useMemo(
    () => [
      ...(imageUrl ? [imageUrl] : []),
      ...gallery.filter((url) => url && url !== imageUrl),
    ],
    [imageUrl, gallery]
  );

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const activeImage = allImages[activeImageIdx] ?? imageUrl ?? null;

  const [activePhotoHotspotId, setActivePhotoHotspotId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoImgRef = useRef<HTMLImageElement>(null);

  // Patch 2: Filter out orphan hotspots in public view (target_image_url not in allImages)
  const validPhotoHotspots = useMemo(
    () => photoHotspots.filter((ph) => allImages.includes(ph.target_image_url)),
    [photoHotspots, allImages]
  );

  // Filter photo hotspots that belong to the currently viewed image
  const currentImageHotspots = useMemo(
    () => validPhotoHotspots.filter((ph) => ph.target_image_url === activeImage),
    [validPhotoHotspots, activeImage]
  );

  const activePhotoHotspot = useMemo(
    () => currentImageHotspots.find((ph) => ph.id === activePhotoHotspotId) ?? null,
    [currentImageHotspots, activePhotoHotspotId]
  );

  // Patch 1: Compute image rect relative to container
  const [imageRect, setImageRect] = useState<ImageRect | null>(null);
  const [prevActiveImage, setPrevActiveImage] = useState(activeImage);

  // Invalidate stale imageRect during render when active image changes
  if (activeImage !== prevActiveImage) {
    setPrevActiveImage(activeImage);
    setImageRect(null);
  }

  const updateImageRect = useCallback(() => {
    const img = photoImgRef.current;
    if (!img) return;
    const rect = computeContainedImageRect(img);
    if (rect) {
      setImageRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - rect.left) < 0.5 &&
          Math.abs(prev.top - rect.top) < 0.5 &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return rect;
      });
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const checkAndMeasure = () => {
      if (isCancelled) return;
      const img = photoImgRef.current;
      if (!img) return;
      const rect = computeContainedImageRect(img);
      if (rect) {
        setImageRect((prev) => {
          if (
            prev &&
            Math.abs(prev.left - rect.left) < 0.5 &&
            Math.abs(prev.top - rect.top) < 0.5 &&
            Math.abs(prev.width - rect.width) < 0.5 &&
            Math.abs(prev.height - rect.height) < 0.5
          ) {
            return prev;
          }
          return rect;
        });
      }
    };

    const img = photoImgRef.current;
    const container = containerRef.current;

    // 1. Guard against preloaded/cached images
    if (img) {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        checkAndMeasure();
      } else if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => {
            if (!isCancelled) checkAndMeasure();
          })
          .catch(() => {
            if (!isCancelled) checkAndMeasure();
          });
      }
      img.addEventListener("load", checkAndMeasure);
    }

    // 2. ResizeObserver on exact positioning container to catch layout shifts & mobile orientation changes
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        if (!isCancelled) checkAndMeasure();
      });
      observer.observe(container);
    }

    window.addEventListener("resize", checkAndMeasure);

    // Initial measure attempt
    checkAndMeasure();

    return () => {
      isCancelled = true;
      if (img) {
        img.removeEventListener("load", checkAndMeasure);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", checkAndMeasure);
    };
  }, [activeImage, tab]);

  // Patch 5: Smart floating callout positioning
  const [calloutStyle, setCalloutStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!activePhotoHotspot || !containerRef.current || !imageRect) {
      setCalloutStyle({});
      return;
    }

    const markerPos = {
      left: imageRect.left + (activePhotoHotspot.position_x / 100) * imageRect.width,
      top: imageRect.top + (activePhotoHotspot.position_y / 100) * imageRect.height,
    };

    // Use requestAnimationFrame so the card DOM is rendered before measuring
    const rafId = requestAnimationFrame(() => {
      const container = containerRef.current;
      const card = cardRef.current;
      if (!container || !card) return;

      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const MARGIN = 10;
      const MARKER_OFFSET = 14; // gap between marker and card edge (12–16px)
      const cardW = cardRect.width;
      const cardH = cardRect.height;

      // Marker position in container coords
      const mX = markerPos.left;
      const mY = markerPos.top;

      // Prefer displaying to the side of the marker (right first, then left)
      let candidateX: number;
      if (mX + MARKER_OFFSET + cardW + MARGIN <= containerRect.width) {
        candidateX = mX + MARKER_OFFSET;
      } else if (mX - MARKER_OFFSET - cardW - MARGIN >= 0) {
        candidateX = mX - MARKER_OFFSET - cardW;
      } else {
        // Fallback to center horizontally only when it cannot fit on either side
        candidateX = (containerRect.width - cardW) / 2;
      }

      // Vertical: try align top slightly above marker, clamp within container
      let candidateY = mY - 20;
      if (candidateY + cardH + MARGIN > containerRect.height) {
        candidateY = containerRect.height - cardH - MARGIN;
      }
      if (candidateY < MARGIN) {
        candidateY = MARGIN;
      }

      // Clamp X
      candidateX = Math.max(MARGIN, Math.min(candidateX, containerRect.width - cardW - MARGIN));

      // Ensure card doesn't go outside viewport (for very small screens / overflow-hidden)
      const absLeft = containerRect.left + candidateX;
      const absTop = containerRect.top + candidateY;
      if (absLeft + cardW > viewportW - MARGIN) {
        candidateX = viewportW - MARGIN - containerRect.left - cardW;
      }
      if (absLeft < MARGIN) {
        candidateX = MARGIN - containerRect.left;
      }
      if (absTop + cardH > viewportH - MARGIN) {
        candidateY = viewportH - MARGIN - containerRect.top - cardH;
      }
      if (absTop < MARGIN) {
        candidateY = MARGIN - containerRect.top;
      }

      // Final clamp within container
      candidateX = Math.max(MARGIN, Math.min(candidateX, containerRect.width - cardW - MARGIN));
      candidateY = Math.max(MARGIN, Math.min(candidateY, containerRect.height - cardH - MARGIN));

      setCalloutStyle({
        left: `${candidateX}px`,
        top: `${candidateY}px`,
        right: "auto",
        bottom: "auto",
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [activePhotoHotspot, imageRect]);

  // Patch 6: Close floating card on outside click / Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".photo-marker-btn")
      ) {
        setActivePhotoHotspotId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePhotoHotspotId(null);
      }
    }

    if (activePhotoHotspotId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhotoHotspotId]);

  return (
    <div className="space-y-4">
      {tab === "foto" ? (
        <div className="space-y-3">
          {/* User Guidance Banner — only shown when current active image has photo hotspots */}
          {tab === "foto" && currentImageHotspots.length > 0 && (
            <div
              role="note"
              aria-label={t("photoHint")}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-[#0EA5A0]/25 bg-[#0EA5A0]/5 dark:bg-[#0EA5A0]/10 transition-colors"
            >
              <div className="p-1 rounded-lg bg-[#0EA5A0]/10 dark:bg-[#0EA5A0]/20 text-[#0EA5A0] shrink-0 mt-0.5">
                <Info size={16} aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t("featureDetail", { name })}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t("photoHint")}
                </p>
              </div>
            </div>
          )}

          {/* Main Photo Container */}
          <div
            ref={containerRef}
            className="w-full aspect-square rounded-2xl flex items-center justify-center relative border select-none"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {activeImage ? (
              <Image
                ref={photoImgRef as React.Ref<HTMLImageElement | null>}
                src={activeImage}
                alt={name}
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                onLoad={updateImageRect}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[120px] opacity-15 select-none">
                🔬
              </div>
            )}

            {brand && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className={DESIGN_TOKENS.badges.categoryNeutral}>{brand}</span>
              </div>
            )}

            {/* Photo Hotspot Markers — positioned using actual image rect */}
            {imageRect &&
              currentImageHotspots.map((ph) => {
                const pos = {
                  left: imageRect.left + (ph.position_x / 100) * imageRect.width,
                  top: imageRect.top + (ph.position_y / 100) * imageRect.height,
                };
                const isActive = ph.id === activePhotoHotspotId;
                return (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() =>
                      setActivePhotoHotspotId((prev) => (prev === ph.id ? null : ph.id))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActivePhotoHotspotId((prev) => (prev === ph.id ? null : ph.id));
                      }
                    }}
                    className="photo-marker-btn absolute z-20 w-11 h-11 flex items-center justify-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A0]"
                    style={{
                      left: `${pos.left}px`,
                      top: `${pos.top}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    aria-label={t("showDetail", { name: ph.title })}
                    aria-expanded={isActive}
                  >
                    <div className="relative flex items-center justify-center pointer-events-none">
                      {/* Pulsing ring */}
                      {isActive ? (
                        <>
                          <span className="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping motion-reduce:animate-none" />
                          <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-red-500 shadow-xl shadow-red-500/40 flex items-center justify-center ring-4 ring-white dark:ring-slate-950">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="absolute w-7 h-7 rounded-full bg-[#0EA5A0]/25 animate-ping opacity-60 motion-reduce:animate-none group-hover:opacity-100 transition-opacity" />
                          <div className="w-5 h-5 rounded-full bg-slate-900/90 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-125 group-active:scale-95 ring-1 ring-black/20 dark:ring-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Marker tooltip on hover */}
                    {!isActive && (
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex items-center px-2.5 py-1 rounded-md bg-slate-900/95 text-white text-[11px] font-medium whitespace-nowrap shadow-xl pointer-events-none z-30 border border-slate-700/50">
                        {ph.title}
                      </div>
                    )}
                  </button>
                );
              })}

            {/* Floating Callout Card — theme-aware & smart positioned */}
            {activePhotoHotspot && (
              <div
                ref={cardRef}
                role="dialog"
                aria-label={t("featureDetail", { name: activePhotoHotspot.title })}
                className="absolute z-30 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-black/30 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 transition-all duration-200 animate-in fade-in zoom-in-95"
                style={{
                  ...calloutStyle,
                  width: "min(250px, calc(100vw - 32px))",
                }}
              >
                {/* Header with Title and Close Button */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1">
                    {activePhotoHotspot.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActivePhotoHotspotId(null)}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-white/40 shrink-0 ml-1.5"
                    aria-label={t("closeDetail")}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Callout Image (compact container with object-contain to display full image without cropping) */}
                <div className="relative w-full h-[150px] max-h-[170px] bg-slate-50 dark:bg-slate-950 overflow-hidden border-b border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <Image
                    src={activePhotoHotspot.callout_image_url}
                    alt={activePhotoHotspot.title}
                    fill
                    className="object-contain object-center p-1"
                    sizes="250px"
                  />
                </div>

                {/* Callout Description */}
                {activePhotoHotspot.description && (
                  <div className="px-3 py-2 max-h-28 overflow-y-auto bg-white dark:bg-slate-900">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {activePhotoHotspot.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {allImages.map((src, idx) => {
                const countHotspots = validPhotoHotspots.filter(
                  (ph) => ph.target_image_url === src
                ).length;
                return (
                  <button
                    key={src + idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setActivePhotoHotspotId(null);
                    }}
                    className={`relative w-16 h-16 rounded-xl border flex-shrink-0 overflow-hidden transition-all ${
                      idx === activeImageIdx
                        ? "border-[#0EA5A0] ring-2 ring-[#0EA5A0]/30 shadow-md scale-105"
                        : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: "var(--bg-secondary)" }}
                  >
                    <Image
                      src={src}
                      alt={t("thumbnail", { name, number: idx + 1 })}
                      fill
                      className="object-contain p-1.5"
                      sizes="64px"
                    />
                    {countHotspots > 0 && (
                      <span className="absolute top-1 right-1 px-1 py-0.2 text-[9px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                        {countHotspots}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full aspect-square rounded-2xl relative border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {model3dUrl ? (
            <Model3DViewer url={model3dUrl} hotspots={hotspots} labels={{ loading: t("loading"), error: t("error"), hotspotHint: t("hotspotHint"), close: t("close") }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              {t("missingModel")}
            </div>
          )}
        </div>
      )}

      {has3d && (
        <button
          type="button"
          onClick={() => {
            setTab(tab === "foto" ? "3d" : "foto");
            setActivePhotoHotspotId(null);
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold border transition-all cursor-pointer bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-[#0EA5A0] hover:text-[#0EA5A0] dark:bg-slate-900/60 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-[#0EA5A0] dark:hover:text-[#0EA5A0]"
        >
          <Box size={18} />
          {tab === "foto" ? t("viewModel") : t("viewPhoto")}
        </button>
      )}
    </div>
  );
}
