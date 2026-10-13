"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import ProductForm from "./ProductForm";
import ProductTranslationEditor, { type TranslationOperation } from "./ProductTranslationEditor";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";
import { reloadProductTranslationEditor } from "@/lib/actions/productTranslationEditor";
import { saveProductTranslation, unpublishProductTranslation, deleteProductTranslation } from "@/lib/actions/productTranslations";
import { acceptLocaleRefresh, blockLocaleDraft, buildSaveInput, createLocaleDraft, hasDirtyTranslations, isLocaleDirty, localeStatus, rebuildLocaleBlock, type LocaleBuffers, type LocaleDraft, type ProductTranslationEditorSnapshot } from "@/lib/product-translation-editor";
import type { ProductTranslationLocale } from "@/lib/product-translation-types";

const TABS = [{ key: "source", label: "Konten Utama" }, { key: "en", label: "English" }, { key: "zh-CN", label: "简体中文" }] as const;
type Tab = typeof TABS[number]["key"];
type HistoryNavigation = {
  addEventListener: (name: string, listener: (event: Event) => void) => void;
  removeEventListener: (name: string, listener: (event: Event) => void) => void;
  traverseTo: (key: string) => { finished: Promise<unknown> };
};
function buffersFrom(snapshot: ProductTranslationEditorSnapshot): LocaleBuffers {
  return { en: createLocaleDraft(snapshot, "en"), "zh-CN": createLocaleDraft(snapshot, "zh-CN") };
}

export default function ProductEditor({ initialSnapshot = null, translationError = "", ...productProps }: ComponentProps<typeof ProductForm> & {
  initialSnapshot?: ProductTranslationEditorSnapshot | null; translationError?: string;
}) {
  const router = useRouter(); const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("source");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [buffers, setBuffers] = useState<LocaleBuffers | null>(() => initialSnapshot ? buffersFrom(initialSnapshot) : null);
  const [loadError, setLoadError] = useState(translationError);
  const [busy, setBusy] = useState<ProductTranslationLocale | "load" | null>(null);
  const busyRef = useRef<typeof busy>(null);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationRef = useRef<((approved: boolean) => void) | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const approvedTraversal = useRef(false);
  const dirty = buffers ? hasDirtyTranslations(buffers) : false;
  const productId = productProps.initial?.id;

  const confirm = useCallback((description: string): Promise<boolean> => {
    if (confirmationRef.current) return Promise.resolve(false);
    return new Promise(resolve => { confirmationRef.current = resolve; setConfirmation(description); });
  }, []);
  const finishConfirmation = (approved: boolean) => {
    const resolve = confirmationRef.current; confirmationRef.current = null; setConfirmation(null); resolve?.(approved);
  };
  const beforeNavigate = useCallback(async () => {
    if (busyRef.current) { toast("info", "Tunggu hingga penyimpanan atau pemuatan terjemahan selesai."); return false; }
    return !dirty || await confirm("Perubahan English/简体中文 belum disimpan. Melanjutkan penyimpanan atau navigasi akan meninggalkan perubahan tersebut. Lanjutkan?");
  }, [confirm, dirty, toast]);

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty || busyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => {
      if ((!dirty && !busyRef.current) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
      event.preventDefault(); event.stopPropagation();
      void beforeNavigate().then(approved => { if (approved) router.push(destination.pathname + destination.search + destination.hash); });
    };
    const historyNavigation = (window as Window & { navigation?: HistoryNavigation }).navigation;
    const traverse = (event: Event) => {
      const change = event as Event & { navigationType: string; destination: { key: string; url: string } };
      if (change.navigationType !== "traverse" || !event.cancelable) return;
      if (approvedTraversal.current) { approvedTraversal.current = false; return; }
      if ((!dirty && !busyRef.current) || new URL(change.destination.url).pathname === location.pathname) return;
      event.preventDefault();
      void beforeNavigate().then(approved => {
        if (approved && historyNavigation) {
          approvedTraversal.current = true;
          void historyNavigation.traverseTo(change.destination.key).finished.catch(() => { approvedTraversal.current = false; });
        }
      });
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    historyNavigation?.addEventListener("navigate", traverse);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); historyNavigation?.removeEventListener("navigate", traverse); };
  }, [beforeNavigate, dirty, router]);
  useEffect(() => () => { confirmationRef.current?.(false); }, []);

  const update = useCallback((locale: ProductTranslationLocale, change: Partial<LocaleDraft>) => {
    setBuffers(current => current ? { ...current, [locale]: { ...current[locale], ...change } } : current);
  }, []);
  const reload = useCallback(async (locale?: ProductTranslationLocale) => {
    if (!productId || busyRef.current || sourceSaving) return;
    if (locale && buffers && isLocaleDirty(buffers[locale]) && !await confirm("Muat ulang akan mengganti perubahan lokal pada bahasa ini dengan data tersimpan. Perubahan bahasa lain tetap dipertahankan. Lanjutkan?")) return;
    busyRef.current = locale ?? "load"; setBusy(busyRef.current);
    try {
      const result = await reloadProductTranslationEditor(productId);
      if (!result.success || !result.snapshot) { setLoadError(result.message); if (locale && buffers) update(locale, blockLocaleDraft(buffers[locale], result.message)); return; }
      const fresh = result.snapshot;
      setSnapshot(fresh); setLoadError("");
      setBuffers(current => locale && current ? acceptLocaleRefresh(current, locale, fresh) : buffersFrom(fresh));
    } catch { const message = "Data terjemahan belum dapat dimuat. Coba muat ulang data."; setLoadError(message); if (locale && buffers) update(locale, blockLocaleDraft(buffers[locale], message)); }
    finally { busyRef.current = null; setBusy(null); }
  }, [productId, sourceSaving, buffers, confirm, update]);
  const operate = useCallback(async (locale: ProductTranslationLocale, operation: TranslationOperation) => {
    if (!buffers || !snapshot || busyRef.current || sourceSaving) return;
    const draft = buffers[locale];
    if (draft.blocked || ((operation === "draft" || operation === "published") && draft.source.translation_source_revision !== snapshot.source.translation_source_revision)) return;
    if ((operation === "delete" || (operation === "unpublish" && isLocaleDirty(draft))) && !await confirm(operation === "delete"
      ? "Hapus terjemahan bahasa ini? Perubahan lokal bahasa ini akan dibuang. Produk Indonesia dan bahasa lain tetap dipertahankan."
      : "Batalkan terbit pada versi tersimpan? Perubahan lokal bahasa ini akan dibuang. Pilih Batal lalu Simpan Draf jika ingin menyimpan perubahan tersebut.")) return;
    let input;
    if (operation === "draft" || operation === "published") {
      try { input = buildSaveInput(draft, operation); }
      catch (error) { update(locale, { message: error instanceof Error && !("issues" in error) ? error.message : "Periksa kelengkapan dan batas panjang bidang terjemahan." }); return; }
    } else if (!draft.row) return;
    busyRef.current = locale; setBusy(locale);
    try {
      const result = input ? await saveProductTranslation(input) : await (operation === "delete" ? deleteProductTranslation : unpublishProductTranslation)({
        productId, locale, expectedTranslationVersion: draft.row!.version, expectedTranslationId: draft.row!.id,
      });
      if (!result.success) { update(locale, result.errors ? { message: result.message } : blockLocaleDraft(draft, result.message)); toast("error", result.message); return; }
      const fresh = await reloadProductTranslationEditor(productId);
      if (!fresh.success || !fresh.snapshot) { update(locale, blockLocaleDraft(draft, "Tersimpan, data terbaru belum dapat dimuat.")); return; }
      setSnapshot(fresh.snapshot); setBuffers(current => current ? acceptLocaleRefresh(current, locale, fresh.snapshot!) : current);
      setLoadError(""); toast("success", operation === "delete" ? "Terjemahan dihapus." : operation === "unpublish" ? "Publikasi terjemahan dibatalkan." : operation === "draft" ? "Draf terjemahan disimpan." : "Terjemahan diterbitkan.");
    } catch { update(locale, blockLocaleDraft(draft, "Penyimpanan belum dapat dikonfirmasi. Muat ulang data sebelum mencoba kembali.")); }
    finally { busyRef.current = null; setBusy(null); }
  }, [buffers, snapshot, sourceSaving, confirm, productId, update, toast]);
  const englishOperation = (operation: TranslationOperation) => { void operate("en", operation); };
  const chineseOperation = (operation: TranslationOperation) => { void operate("zh-CN", operation); };
  const englishReload = () => { void reload("en"); };
  const chineseReload = () => { void reload("zh-CN"); };

  return (
    <div data-product-editor className="space-y-5">
      <div ref={tabsRef} role="tablist" aria-label="Bahasa konten produk" className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const enabled = Array.from(tabsRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
        const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length;
        event.preventDefault(); enabled[next]?.focus(); enabled[next]?.click();
      }}>
        {TABS.map(item => <button key={item.key} id={`product-tab-${item.key}`} role="tab" type="button" aria-selected={tab === item.key} aria-controls={`product-panel-${item.key}`} tabIndex={tab === item.key ? 0 : -1} disabled={sourceSaving || (item.key !== "source" && !buffers)} onClick={() => setTab(item.key)} className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#0EA5A0] disabled:opacity-50 ${tab === item.key ? "border-[#0EA5A0] text-[#0C8C87] dark:text-teal-300" : "border-transparent text-slate-500 dark:text-slate-400"}`}>
          {item.label}{item.key !== "source" && buffers && <span className="ml-2 text-xs">· {buffers[item.key].source.translation_source_revision !== snapshot?.source.translation_source_revision ? "Perlu ditinjau ulang" : localeStatus(buffers[item.key])}{isLocaleDirty(buffers[item.key]) ? " *" : ""}</span>}
          {item.key !== "source" && productId && !buffers && <span className="ml-2 text-xs">· Data belum dapat dimuat</span>}
        </button>)}
      </div>
      {!productId && <p className="text-sm text-slate-500">Simpan produk terlebih dahulu sebelum menambahkan terjemahan.</p>}
      {loadError && <div role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-700 dark:text-red-300">{loadError}{productId && <button type="button" disabled={busy !== null} className="ml-3 min-h-11 font-semibold underline" onClick={() => void reload(buffers ? tab === "source" ? "en" : tab : undefined)}>Muat ulang data</button>}</div>}
      <div id="product-panel-source" role="tabpanel" aria-labelledby="product-tab-source" hidden={tab !== "source"}>
        <ProductForm {...productProps} onBeforeNavigate={beforeNavigate} onSavingChange={setSourceSaving} />
      </div>
      {buffers && snapshot && (["en", "zh-CN"] as const).map(locale => <div key={locale} id={`product-panel-${locale}`} role="tabpanel" aria-labelledby={`product-tab-${locale}`} hidden={tab !== locale}>
        <ProductTranslationEditor draft={buffers[locale]} busy={busy === locale || sourceSaving} actionsBusy={busy !== null || sourceSaving} currentSourceRevision={snapshot.source.translation_source_revision} onChange={change => update(locale, change)} onRebuild={block => { try { update(locale, rebuildLocaleBlock(buffers[locale], block)); } catch { update(locale, { message: "Struktur sumber tidak valid. Perbaiki Konten Utama." }); } }} onOperation={locale === "en" ? englishOperation : chineseOperation} onReload={locale === "en" ? englishReload : chineseReload} />
      </div>)}
      {confirmation && <div role="dialog" aria-modal="true" aria-label="Konfirmasi perubahan terjemahan" ref={node => { node?.querySelector<HTMLButtonElement>("button")?.focus(); }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); finishConfirmation(false); }
        if (event.key === "Tab") { const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus(); }
      }}><ConfirmDialog title="Konfirmasi perubahan" description={confirmation} confirmLabel="Lanjutkan" onConfirm={() => finishConfirmation(true)} onCancel={() => finishConfirmation(false)} /></div>}
    </div>
  );
}
