"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Search, X, Package } from "lucide-react";
import type { PublicLocale } from "@/i18n/locales";
import type { StoreSearchItem, StoreSuggestion, StoreSuggestResult } from "@/lib/store-search-types";
import { formatRupiah } from "@/lib/format";

const MAX_SUGGESTIONS = 6;
const DEBOUNCE_MS = 250;

export default function StoreSearchBar({
  products,
  locale,
  rpcEnabled,
  onQueryChange,
}: {
  products: StoreSearchItem[];
  locale: PublicLocale;
  rpcEnabled: boolean;
  onQueryChange: (q: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [input, setInput] = useState(initialQ);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [remote, setRemote] = useState<{ key: string; items?: StoreSuggestion[]; error?: boolean } | null>(null);
  const key = JSON.stringify([locale, input.trim()]);

  const localSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.canonical.name.toLowerCase().includes(q) ||
          p.canonical.brand.toLowerCase().includes(q) ||
          p.canonical.category.toLowerCase().includes(q) ||
          (p.canonical.sku && p.canonical.sku.toLowerCase().includes(q)),
      )
      .slice(0, MAX_SUGGESTIONS)
      .map(p => ({ id: p.canonical.id, slug: p.canonical.slug, displayName: p.display.name,
        brand: p.canonical.brand, sku: p.canonical.sku ?? null, image_url: p.canonical.image_url ?? null,
        price: p.canonical.price ?? null }));
  }, [input, products]);
  useEffect(() => {
    if (!rpcEnabled || [...input.trim()].length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ mode: "suggest", locale, q: input.trim() });
      fetch(`/api/store/search?${params}`, { signal: controller.signal, cache: "no-store" })
        .then(async response => {
          if (!response.ok) throw new Error("suggest");
          const result: unknown = await response.json();
          const data = (result as { data?: StoreSuggestResult } | null)?.data;
          if (data?.mode !== "suggest" || !Array.isArray(data.items)) throw new Error("suggest");
          setRemote({ key, items: data.items });
        }).catch(() => { if (!controller.signal.aborted) setRemote({ key, error: true }); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [rpcEnabled, key, locale, input]);
  const active = remote?.key === key ? remote : null;
  const suggestions = rpcEnabled ? active?.items ?? [] : localSuggestions;

  const syncToURL = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      router.push(`/store?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  function handleChange(value: string) {
    setInput(value);
    setHighlightIdx(-1);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value);
      syncToURL(value);
    }, DEBOUNCE_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onQueryChange(input);
    syncToURL(input);
    setOpen(false);
    inputRef.current?.blur();
  }

  function selectSuggestion(product: StoreSuggestion) {
    setInput("");
    setOpen(false);
    onQueryChange("");
    syncToURL("");
    router.push(`/store/${product.slug}`);
  }

  function clearInput() {
    setInput("");
    setOpen(false);
    onQueryChange("");
    syncToURL("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = open && [...input.trim()].length >= 2;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => input.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cari komponen, merek, atau SKU..."
          className="w-full rounded-sm border pl-8 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {input && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={13} className="text-slate-400" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          className="absolute z-40 top-full mt-1 w-full rounded-sm border shadow-lg overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {rpcEnabled && active?.error ? (
            <div role="alert" className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Pencarian Komponen belum tersedia. Silakan coba lagi.
            </div>
          ) : rpcEnabled && !active ? (
            <div role="status" className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>Sedang mencari...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                Tidak ada hasil untuk &quot;{input.trim()}&quot;
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {suggestions.map((product, idx) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(product)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      idx === highlightIdx ? "bg-[#0EA5A0]/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.displayName}
                        className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)" }}>
                        <Package size={14} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {product.displayName}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {product.brand}
                        {product.sku ? ` · ${product.sku}` : ""}
                      </p>
                    </div>
                    {product.price != null && (
                      <span className="text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums flex-shrink-0">
                        {formatRupiah(product.price)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {suggestions.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full px-3 py-2 text-[11px] font-semibold text-[#0EA5A0] border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              Lihat semua hasil untuk &quot;{input.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
