"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

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
        className="relative aspect-square rounded-sm border overflow-hidden"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
      >
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt={`${name} - gambar ${activeIdx + 1}`}
            fill
            className="object-contain p-3"
            sizes="(max-width: 1023px) calc(100vw - 32px), (max-width: 1280px) 65vw, 920px"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={64} className="text-slate-400" />
          </div>
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
              className={`relative w-[60px] h-[60px] rounded-sm border flex-shrink-0 overflow-hidden transition-colors ${
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
