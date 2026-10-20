"use client";

import { useEffect, useState } from "react";
import Link from "@/i18n/navigation";
import Image from "next/image";
import { Package } from "lucide-react";
import { useRecentlyViewed } from "@/components/store/useRecentlyViewed";
import { formatRupiah } from "@/lib/format";
import type { PublicLocale } from "@/i18n/locales";
import type { toStoreRecentView } from "@/lib/public-store-presentation";

type RecentView = ReturnType<typeof toStoreRecentView>;

export default function RecentlyViewed({ locale }: { locale: PublicLocale }) {
  const { items, hydrated } = useRecentlyViewed();
  const key = JSON.stringify([locale, ...items.slice(0, 8).map(item => item.id)]);
  const [resolved, setResolved] = useState<{ key: string; items: RecentView[] } | null>(null);

  useEffect(() => {
    if (!hydrated || !items.length) return;
    const controller = new AbortController();
    fetch("/api/store/recent", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, ids: items.slice(0, 8).map(item => item.id) }),
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("recent");
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !Array.isArray((result as { data?: unknown }).data)) throw new Error("recent");
      setResolved({ key, items: (result as { data: RecentView[] }).data });
    }).catch(() => { if (!controller.signal.aborted) setResolved({ key, items: [] }); });
    return () => controller.abort();
  }, [hydrated, key, locale, items]);

  if (!hydrated || resolved?.key !== key || resolved.items.length === 0) return null;

  return (
    <div className="border-t pt-8 mt-8" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Baru Dilihat
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {resolved.items.map((item) => (
          <Link
            key={item.id}
            href={`/store/${item.slug}`}
            className="flex-shrink-0 w-[180px] rounded-sm border hover:border-[#0EA5A0] transition-colors overflow-hidden group"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            {/* Image */}
            <div className="relative aspect-square border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.displayName}
                  fill
                  className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  sizes="180px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package size={24} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="text-[11px] font-semibold line-clamp-2 leading-snug min-h-[2rem]" style={{ color: "var(--text-primary)" }}>
                {item.displayName}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.brand}</p>
              <div className="mt-1">
                {item.price != null ? (
                  <span className="text-red-600 dark:text-red-400 font-bold text-xs">
                    {formatRupiah(item.price)}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Harga: hubungi kami</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
