"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MikaPaginationMeta } from "@/types/mika-career";

interface MikaPaginationProps {
  meta: MikaPaginationMeta;
  onPageChange: (page: number) => void;
}

export default function MikaPagination({ meta, onPageChange }: MikaPaginationProps) {
  if (meta.total_pages <= 1) return null;

  const pages = Array.from({ length: meta.total_pages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Menampilkan halaman <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{meta.current_page}</span> dari{" "}
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{meta.total_pages}</span> (Total {meta.total_items} posisi)
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2">
        {/* Prev Button */}
        <button
          type="button"
          disabled={!meta.has_prev}
          onClick={() => onPageChange(meta.current_page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0EA5A0]/10 hover:border-[#0EA5A0] hover:text-[#0EA5A0]"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          <ChevronLeft size={14} />
          Sebelumnya
        </button>

        {/* Page Numbers */}
        <div className="flex flex-wrap justify-center items-center gap-1">
          {pages.map((p) => {
            const isActive = p === meta.current_page;
            return (
              <button
                key={p}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#0EA5A0] text-white shadow-sm shadow-teal-500/20"
                    : "border hover:border-[#0EA5A0] hover:text-[#0EA5A0]"
                }`}
                style={
                  !isActive
                    ? {
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                        backgroundColor: "var(--bg-card)",
                      }
                    : undefined
                }
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={!meta.has_next}
          onClick={() => onPageChange(meta.current_page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0EA5A0]/10 hover:border-[#0EA5A0] hover:text-[#0EA5A0]"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          Selanjutnya
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
