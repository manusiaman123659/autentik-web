"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("products.storeUi");
  const listId = useId();
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
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <form onSubmit={handleSubmit} className="relative">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t("search")}
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showDropdown && highlightIdx >= 0 && suggestions[highlightIdx] ? `${listId}-${highlightIdx}` : undefined}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => input.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search")}
          className="min-h-12 w-full rounded border border-slate-500 dark:border-slate-400 pl-9 pr-12 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        />
        {input && (
          <button
            type="button"
            onClick={clearInput}
            aria-label={t("clearSearch")}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded focus-visible:outline-2"
          >
            <X size={13} className="text-slate-400" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          className="absolute z-40 top-full mt-2 w-full rounded border shadow-md max-h-[60dvh] overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {rpcEnabled && active?.error ? (
            <div role="alert" className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {t("error")}
            </div>
          ) : rpcEnabled && !active ? (
            <div role="status" className="px-3 py-4 text-center text-sm text-body">{t("searching")}</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {t("searchEmpty", { query: input.trim() })}
              </p>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label={t("search")} className="py-1">
              {suggestions.map((product, idx) => (
                <li key={product.id} role="option" id={`${listId}-${idx}`} aria-selected={idx === highlightIdx}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(product)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    tabIndex={-1}
                    className={`min-h-14 w-full flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-3 py-3 text-left focus-visible:outline-2 ${
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
                      <p className="text-sm font-semibold break-words" style={{ color: "var(--text-primary)" }}>
                        {product.displayName}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {product.brand}
                        {product.sku ? ` · ${product.sku}` : ""}
                      </p>
                    </div>
                    {product.price != null && (
                      <span className="text-sm font-semibold text-red-700 dark:text-red-400 tabular-nums">
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
              className="min-h-11 w-full px-3 py-3 text-sm font-semibold text-teal-700 dark:text-teal-300 border-t focus-visible:outline-2"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {t("searchAll", { query: input.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
