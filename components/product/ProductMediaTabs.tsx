"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Box } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

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
  model3dUrl?: string;
}

export default function ProductMediaTabs({
  name,
  brand,
  imageUrl,
  model3dUrl,
}: ProductMediaTabsProps) {
  const [tab, setTab] = useState<"foto" | "3d">("foto");
  const has3d = Boolean(model3dUrl);

  return (
    <div className="space-y-4">
      {tab === "foto" ? (
        <div
          className="w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[120px] opacity-15 select-none">
              🔬
            </div>
          )}
          {brand && (
            <div className="absolute top-4 left-4 z-10">
              <span className={DESIGN_TOKENS.badges.categoryNeutral}>{brand}</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full aspect-square rounded-2xl relative overflow-hidden border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {model3dUrl ? (
            <Model3DViewer url={model3dUrl} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Model 3D tidak tersedia.
            </div>
          )}
        </div>
      )}

      {has3d && (
        <button
          type="button"
          onClick={() => setTab(tab === "foto" ? "3d" : "foto")}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold border transition-all hover:border-[#0EA5A0] hover:text-[#0EA5A0]"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-color)" }}
        >
          <Box size={18} />
          {tab === "foto" ? "Lihat Produk dalam 3D" : "Lihat Foto"}
        </button>
      )}
    </div>
  );
}