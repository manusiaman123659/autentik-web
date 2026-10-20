"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import StoreMediaPlaceholder from "./StoreMediaPlaceholder";

interface ProductImageGalleryProps {
  imageUrl: string | null;
  gallery: string[];
  brand: string;
  name: string;
  badges?: React.ReactNode;
}

export default function ProductImageGallery({
  imageUrl,
  gallery,
  brand,
  name,
  badges,
}: ProductImageGalleryProps) {
  const t = useTranslations("products.storeUi");
  const allImages = [
    ...(imageUrl ? [imageUrl] : []),
    ...gallery.filter((url) => url && url !== imageUrl),
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const activeSrc = allImages[activeIdx] ?? null;

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div
        className="relative h-[220px] sm:h-[300px] lg:h-[360px] rounded border overflow-hidden"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
      >
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt={t("image", { name, number: activeIdx + 1 })}
            fill
            className="object-contain p-3"
            sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1279px) 40vw, 480px"
            loading="eager"
          />
        ) : (
          <StoreMediaPlaceholder brand={brand} />
        )}

        {/* Brand badge */}
        <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-[#0B1F3A] text-white">
          {brand}
        </span>

        {/* Custom badges slot */}
        {badges}

        {/* Image counter */}
        {allImages.length > 1 && (
          <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-black/60 text-white tabular-nums">
            {activeIdx + 1}/{allImages.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto thin-scrollbar pb-0.5">
          {allImages.map((url, idx) => (
            <button
              key={url + idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
                aria-label={t("thumbnail", { number: idx + 1 })}
                aria-pressed={idx === activeIdx}
                className={`relative w-[60px] h-[60px] rounded border flex-shrink-0 overflow-hidden focus-visible:outline-2 focus-visible:outline-teal-600 ${
                idx === activeIdx
                  ? "border-[#0EA5A0] ring-1 ring-[#0EA5A0]/30"
                  : "border-[var(--border-subtle)] opacity-60 hover:opacity-100"
              }`}
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <Image
                src={url}
                alt={`${name} thumbnail ${idx + 1}`}
                fill
                className="object-contain p-1"
                sizes="60px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
