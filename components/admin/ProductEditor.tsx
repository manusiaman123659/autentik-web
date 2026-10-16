"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import ProductForm from "./ProductForm";
import ProductTranslationEditor, { type TranslationOperation } from "./ProductTranslationEditor";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";
import { reloadProductTranslationEditor } from "@/lib/actions/productTranslationEditor";
import { saveProductTranslation, unpublishProductTranslation, deleteProductTranslation } from "@/lib/actions/productTranslations";
import { generateProductTranslationDraft } from "@/lib/actions/productTranslationGeneration";
import { machineGeneratedUntouched } from "@/lib/product-translation-generation";
import { acceptLocaleRefresh, applyGeneratedCandidate, blockLocaleDraft, buildSaveInput, createLocaleDraft, hasDirtyTranslations, isLocaleDirty, localeStatus, rebuildLocaleBlock, type LocaleBuffers, type LocaleDraft, type ProductTranslationEditorSnapshot } from "@/lib/product-translation-editor";
import type { ProductTranslationLocale } from "@/lib/product-translation-types";

const TABS = [{ key: "source", label: "Konten Utama" }, { key: "en", label: "English" }, { key: "zh-CN", label: "简体中文" }] as const;
type Tab = typeof TABS[number]["key"];
type GenerationState = { pending: boolean; message: string; error: boolean };
const idleGeneration: GenerationState = { pending: false, message: "", error: false };
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
  const [generation, setGeneration] = useState<Record<ProductTranslationLocale, GenerationState>>({ en: idleGeneration, "zh-CN": idleGeneration });
  const generationRef = useRef<Record<ProductTranslationLocale, symbol | null>>({ en: null, "zh-CN": null });
  const epochs = useRef({ en: 0, "zh-CN": 0 });
  const latest = useRef({ buffers, snapshot, productId });
  const mounted = useRef(true);
  useLayoutEffect(() => { latest.current = { buffers, snapshot, productId }; }, [buffers, snapshot, productId]);
  const generationBusy = useCallback(() => generationRef.current.en !== null || generationRef.current["zh-CN"] !== null, []);
  const generationState = useCallback((locale: ProductTranslationLocale, change: Partial<GenerationState>) => {
    if (mounted.current) setGeneration(current => ({ ...current, [locale]: { ...current[locale], ...change } }));
  }, []);

  const confirm = useCallback((description: string): Promise<boolean> => {
    if (confirmationRef.current) return Promise.resolve(false);
    return new Promise(resolve => { confirmationRef.current = resolve; setConfirmation(description); });
  }, []);
  const finishConfirmation = (approved: boolean) => {
    const resolve = confirmationRef.current; confirmationRef.current = null; setConfirmation(null); resolve?.(approved);
  };
  const beforeNavigate = useCallback(async () => {
    if (busyRef.current || generationBusy()) { toast("info", "Tunggu hingga penyimpanan, pemuatan, atau pembuatan draf AI selesai."); return false; }
    return !dirty || await confirm("Perubahan English/简体中文 belum disimpan. Melanjutkan penyimpanan atau navigasi akan meninggalkan perubahan tersebut. Lanjutkan?");
  }, [confirm, dirty, toast, generationBusy]);

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty || busyRef.current || generationBusy()) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => {
      if ((!dirty && !busyRef.current && !generationBusy()) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
      if ((!dirty && !busyRef.current && !generationBusy()) || new URL(change.destination.url).pathname === location.pathname) return;
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
  }, [beforeNavigate, dirty, router, generationBusy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generationRef.current = { en: null, "zh-CN": null }; confirmationRef.current?.(false); }; }, []);

  const update = useCallback((locale: ProductTranslationLocale, change: Partial<LocaleDraft>) => {
    epochs.current[locale]++;
    setBuffers(current => current ? { ...current, [locale]: { ...current[locale], ...change } } : current);
  }, []);
  const reload = useCallback(async (locale?: ProductTranslationLocale) => {
    if (!productId || busyRef.current || sourceSaving || (locale ? generationRef.current[locale] !== null : generationBusy())) return;
    if (locale && buffers && isLocaleDirty(buffers[locale]) && !await confirm("Muat ulang akan mengganti perubahan lokal pada bahasa ini dengan data tersimpan. Perubahan bahasa lain tetap dipertahankan. Lanjutkan?")) return;
    busyRef.current = locale ?? "load"; setBusy(busyRef.current);
    try {
      const result = await reloadProductTranslationEditor(productId);
      if (!result.success || !result.snapshot) { setLoadError(result.message); if (locale && buffers) update(locale, blockLocaleDraft(buffers[locale], result.message)); return; }
      const fresh = result.snapshot;
      if (locale) { epochs.current[locale]++; generationState(locale, idleGeneration); }
      else { epochs.current.en++; epochs.current["zh-CN"]++; setGeneration({ en: idleGeneration, "zh-CN": idleGeneration }); }
      latest.current.snapshot = fresh;
      setSnapshot(fresh); setLoadError("");
      setBuffers(current => locale && current ? acceptLocaleRefresh(current, locale, fresh) : buffersFrom(fresh));
    } catch { const message = "Data terjemahan belum dapat dimuat. Coba muat ulang data."; setLoadError(message); if (locale && buffers) update(locale, blockLocaleDraft(buffers[locale], message)); }
    finally { busyRef.current = null; setBusy(null); }
  }, [productId, sourceSaving, buffers, confirm, update, generationBusy, generationState]);
  const operate = useCallback(async (locale: ProductTranslationLocale, operation: TranslationOperation) => {
    if (!buffers || !snapshot || busyRef.current || sourceSaving || generationRef.current[locale] !== null) return;
    const draft = buffers[locale];
    if ((operation === "draft" || operation === "published") && machineGeneratedUntouched(draft)) {
      toast("info", "Draf dibuat oleh AI. Tinjau dan edit hasil sebelum menyimpan atau menerbitkan."); return;
    }
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
      epochs.current[locale]++; generationState(locale, idleGeneration); latest.current.snapshot = fresh.snapshot;
      setSnapshot(fresh.snapshot); setBuffers(current => current ? acceptLocaleRefresh(current, locale, fresh.snapshot!) : current);
      setLoadError(""); toast("success", operation === "delete" ? "Terjemahan dihapus." : operation === "unpublish" ? "Publikasi terjemahan dibatalkan." : operation === "draft" ? "Draf terjemahan disimpan." : "Terjemahan diterbitkan.");
    } catch { update(locale, blockLocaleDraft(draft, "Penyimpanan belum dapat dikonfirmasi. Muat ulang data sebelum mencoba kembali.")); }
    finally { busyRef.current = null; setBusy(null); }
  }, [buffers, snapshot, sourceSaving, confirm, productId, update, toast, generationState]);
  const generate = useCallback(async (locale: ProductTranslationLocale) => {
    if (!buffers || !snapshot || !productId || productProps.productType !== "b2b_system" || sourceSaving || busyRef.current || generationRef.current[locale] !== null) return;
    const anchor = buffers[locale]; const revision = anchor.source.translation_source_revision; const epoch = epochs.current[locale];
    if (anchor.blocked || anchor.source.id !== productId || snapshot.source.id !== productId || snapshot.source.translation_source_revision !== revision) return;
    const token = Symbol(locale); generationRef.current[locale] = token;
    const currentRequest = () => mounted.current && generationRef.current[locale] === token && latest.current.productId === productId
      && epochs.current[locale] === epoch && latest.current.buffers?.[locale] === anchor && latest.current.snapshot?.source.translation_source_revision === revision;
    try {
      if ((anchor.row !== null || isLocaleDirty(anchor)) && !await confirm("Terjemahan pada bahasa ini akan diganti dengan hasil draf AI. Konten Indonesia dan bahasa lain tidak berubah. Lanjutkan?")) return;
      if (!currentRequest()) return;
      generationState(locale, { pending: true, message: "", error: false });
      const result = await generateProductTranslationDraft({ productId, locale, expectedSourceRevision: revision });
      if (!mounted.current || generationRef.current[locale] !== token) return;
      if (!currentRequest()) { generationState(locale, { error: true, message: "Sumber atau buffer berubah. Draf AI tidak diterapkan; muat ulang data jika diperlukan." }); return; }
      if (!result.success || !result.candidate) { generationState(locale, { error: true, message: result.message }); return; }
      const generated = applyGeneratedCandidate(anchor, result.candidate);
      setBuffers(current => current && current[locale] === anchor && epochs.current[locale] === epoch
        && latest.current.snapshot?.source.translation_source_revision === revision ? { ...current, [locale]: generated } : current);
      generationState(locale, { error: false, message: "Draf AI dimuat sebagai kandidat. Belum ada perubahan tersimpan." });
    } catch { generationState(locale, { error: true, message: "Draf AI belum dapat diterapkan. Perubahan lokal tetap dipertahankan." }); }
    finally { if (generationRef.current[locale] === token) { generationRef.current[locale] = null; generationState(locale, { pending: false }); } }
  }, [buffers, snapshot, productId, productProps.productType, sourceSaving, confirm, generationState]);
  const englishOperation = (operation: TranslationOperation) => { void operate("en", operation); };
  const chineseOperation = (operation: TranslationOperation) => { void operate("zh-CN", operation); };
  const englishReload = () => { void reload("en"); };
  const chineseReload = () => { void reload("zh-CN"); };
  const englishChange = (change: Partial<LocaleDraft>) => update("en", change);
  const chineseChange = (change: Partial<LocaleDraft>) => update("zh-CN", change);
  const englishGenerate = () => { void generate("en"); };
  const chineseGenerate = () => { void generate("zh-CN"); };
  const rebuild = (locale: ProductTranslationLocale, block: "features" | "specs") => {
    if (!buffers) return;
    try { update(locale, rebuildLocaleBlock(buffers[locale], block)); }
    catch { update(locale, { message: "Struktur sumber tidak valid. Perbaiki Konten Utama." }); }
  };
  const englishRebuild = (block: "features" | "specs") => rebuild("en", block);
  const chineseRebuild = (block: "features" | "specs") => rebuild("zh-CN", block);

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
        <ProductTranslationEditor draft={buffers[locale]} busy={busy === locale || sourceSaving} actionsBusy={busy !== null || sourceSaving} currentSourceRevision={snapshot.source.translation_source_revision} onChange={locale === "en" ? englishChange : chineseChange} onRebuild={locale === "en" ? englishRebuild : chineseRebuild} onOperation={locale === "en" ? englishOperation : chineseOperation} onReload={locale === "en" ? englishReload : chineseReload}
          onGenerate={productProps.productType === "b2b_system" ? locale === "en" ? englishGenerate : chineseGenerate : undefined} generating={generation[locale].pending} generationMessage={generation[locale].message} generationError={generation[locale].error} />
      </div>)}
      {confirmation && <div role="dialog" aria-modal="true" aria-label="Konfirmasi perubahan terjemahan" ref={node => { node?.querySelector<HTMLButtonElement>("button")?.focus(); }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); finishConfirmation(false); }
        if (event.key === "Tab") { const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus(); }
      }}><ConfirmDialog title="Konfirmasi perubahan" description={confirmation} confirmLabel="Lanjutkan" onConfirm={() => finishConfirmation(true)} onCancel={() => finishConfirmation(false)} /></div>}
    </div>
  );
}
