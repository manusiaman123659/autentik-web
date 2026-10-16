import { z } from "zod";
import { productIdSchema } from "./validations/productSchema";
import { productTranslationRowSchema, productTranslationSaveSchema } from "./validations/productTranslationSchema";
import { validateProductTranslationBlocks } from "./product-translations";
import type { ProductTranslationLocale, ProductTranslationStatus, ProductSpecification } from "./product-translation-types";
import { generationCandidateSchema, createGeneratedSnapshot, machineGeneratedUntouched, type GenerationCandidate, type NormalizedEditableContent } from "./product-translation-generation";

const revision = z.number().int().min(1).max(2147483647);
const sourceSchema = z.object({
  id: productIdSchema, slug: z.string().min(1), product_type: z.enum(["b2b_system", "sparepart"]),
  name: z.string(), description: z.string(), features: z.unknown(), specs: z.unknown(),
  seo_title: z.string().nullable(), seo_description: z.string().nullable(),
  translation_source_revision: revision, status: z.string().nullable(), is_active: z.boolean().nullable(), deleted_at: z.null(),
});
const managedRowSchema = productTranslationRowSchema.safeExtend({ id: z.string().uuid(), version: revision });
export type EditorSource = z.infer<typeof sourceSchema>;
export type ManagedTranslationRow = z.infer<typeof managedRowSchema>;
export interface ProductTranslationEditorSnapshot { source: EditorSource; rows: ManagedTranslationRow[] }
export interface LocaleContent {
  name: string; description: string; seo_title: string; seo_description: string;
  features: string[] | null;
  specs: { label: string; value_text: string }[] | null;
}
export interface LocaleDraft {
  source: EditorSource; row: ManagedTranslationRow | null; locale: ProductTranslationLocale;
  content: LocaleContent; baseline: string; reviewedRevision: number | null;
  initialReviewedRevision: number | null; blocked: boolean; message: string;
  generatedCandidateSnapshot?: NormalizedEditableContent;
}
export type LocaleBuffers = Record<ProductTranslationLocale, LocaleDraft>;

export function parseEditorSnapshot(product: Record<string, unknown>, rows: unknown[]): ProductTranslationEditorSnapshot {
  const source = sourceSchema.parse(Object.fromEntries(Object.keys(sourceSchema.shape).map(key => [key, product[key]])));
  const parsed = rows.map(row => managedRowSchema.parse(row));
  if (parsed.some(row => row.product_id !== source.id) || new Set(parsed.map(row => row.locale)).size !== parsed.length) {
    throw new Error("Data terjemahan tidak sesuai dengan produk.");
  }
  return { source, rows: parsed };
}

export function sourceFeatures(source: EditorSource): string[] | null {
  return Array.isArray(source.features) && source.features.length <= 1000 && source.features.every(item => typeof item === "string") ? source.features : null;
}
export function sourceSpecs(source: EditorSource): ProductSpecification[] | null {
  const parsed = z.array(z.object({ label: z.string(), value: z.string(), value_kind: z.enum(["technical", "text"]).optional() })).max(1000).safeParse(source.specs);
  return parsed.success ? parsed.data : null;
}
export function createLocaleDraft(snapshot: ProductTranslationEditorSnapshot, locale: ProductTranslationLocale): LocaleDraft {
  const row = snapshot.rows.find(row => row.locale === locale) ?? null;
  const content: LocaleContent = {
    name: row?.name ?? "", description: row?.description ?? "", seo_title: row?.seo_title ?? "", seo_description: row?.seo_description ?? "",
    features: row?.features ? [...row.features] : null,
    specs: row?.specs ? row.specs.map(spec => ({ label: spec.label ?? "", value_text: spec.value_text ?? "" })) : null,
  };
  const reviewedRevision = row && row.source_revision !== snapshot.source.translation_source_revision ? null : snapshot.source.translation_source_revision;
  return { source: snapshot.source, row, locale, content, baseline: JSON.stringify(content), reviewedRevision, initialReviewedRevision: reviewedRevision, blocked: false, message: "" };
}
export function isLocaleDirty(draft: LocaleDraft): boolean {
  return draft.generatedCandidateSnapshot !== undefined || JSON.stringify(draft.content) !== draft.baseline || draft.reviewedRevision !== draft.initialReviewedRevision;
}
export function hasDirtyTranslations(buffers: Partial<LocaleBuffers>): boolean {
  return Object.values(buffers).some(draft => draft && isLocaleDirty(draft));
}
export function localeStatus(draft: LocaleDraft): string {
  if (draft.row && draft.row.source_revision !== draft.source.translation_source_revision) return "Perlu ditinjau ulang";
  return draft.row ? draft.row.status === "published" ? "Terbit" : "Draf" : "Belum dibuat";
}
export function rebuildLocaleBlock(draft: LocaleDraft, block: "features" | "specs"): LocaleDraft {
  const value = block === "features" ? sourceFeatures(draft.source)?.map(() => "") : sourceSpecs(draft.source)?.map(() => ({ label: "", value_text: "" }));
  if (!value) throw new Error("Struktur sumber tidak valid. Perbaiki konten Indonesia terlebih dahulu.");
  return { ...draft, reviewedRevision: null, content: { ...draft.content, [block]: value } };
}
export function buildSaveInput(draft: LocaleDraft, status: ProductTranslationStatus) {
  if (draft.blocked) throw new Error("Muat ulang data sebelum menyimpan kembali.");
  if (machineGeneratedUntouched(draft)) throw new Error("Draf dibuat oleh AI. Tinjau dan edit hasil sebelum menyimpan atau menerbitkan.");
  if (!sourceFeatures(draft.source) || !sourceSpecs(draft.source)) throw new Error("Struktur fitur atau Spesifikasi Indonesia tidak valid. Perbaiki konten utama.");
  if (draft.row?.source_revision !== undefined && draft.row.source_revision !== draft.source.translation_source_revision && draft.reviewedRevision !== draft.source.translation_source_revision) {
    throw new Error("Tinjau isi dan urutan terjemahan terhadap sumber Indonesia terbaru terlebih dahulu.");
  }
  const specs = sourceSpecs(draft.source)!;
  if ((draft.content.features !== null && draft.content.features.length !== sourceFeatures(draft.source)!.length)
    || (draft.content.specs !== null && draft.content.specs.length !== specs.length)) throw new Error("Struktur sumber berubah. Susun ulang blok terjemahan atau gunakan konten Indonesia.");
  const input = productTranslationSaveSchema.parse({
    productId: draft.source.id, locale: draft.locale, status,
    expectedSourceRevision: draft.source.translation_source_revision,
    expectedTranslationVersion: draft.row?.version ?? null, expectedTranslationId: draft.row?.id ?? null,
    payload: {
      name: draft.content.name, description: draft.content.description, seo_title: draft.content.seo_title, seo_description: draft.content.seo_description,
      features: draft.content.features?.map((text, source_index) => ({ text, source_index })) ?? null,
      specs: draft.content.specs?.map((spec, source_index) => ({ label: spec.label, value_text: specs[source_index].value_kind === "text" ? spec.value_text : null, source_index })) ?? null,
    },
  });
  if (!validateProductTranslationBlocks({ ...draft.source, features: sourceFeatures(draft.source)!, specs, deleted_at: null }, input.payload)) throw new Error("Struktur terjemahan tidak sesuai dengan sumber.");
  return input;
}
export function acceptLocaleRefresh(buffers: LocaleBuffers, locale: ProductTranslationLocale, snapshot: ProductTranslationEditorSnapshot): LocaleBuffers {
  return { ...buffers, [locale]: createLocaleDraft(snapshot, locale) };
}
export function blockLocaleDraft(draft: LocaleDraft, message: string): LocaleDraft {
  return { ...draft, blocked: true, message };
}

export function applyGeneratedCandidate(draft: LocaleDraft, input: GenerationCandidate): LocaleDraft {
  const candidate = generationCandidateSchema.parse(input);
  if (draft.blocked || draft.source.product_type !== "b2b_system" || candidate.productId !== draft.source.id || candidate.locale !== draft.locale || candidate.sourceRevision !== draft.source.translation_source_revision) {
    throw new Error("Sumber atau buffer berubah. Muat ulang data sebelum membuat draf AI.");
  }
  const features = sourceFeatures(draft.source); const specs = sourceSpecs(draft.source);
  if (!features || !specs || !validateProductTranslationBlocks({ ...draft.source, features, specs }, candidate.payload)) throw new Error("Struktur hasil terjemahan tidak sesuai sumber.");
  const payload = candidate.payload;
  const content: LocaleContent = { name: payload.name ?? "", description: payload.description ?? "", seo_title: payload.seo_title ?? "", seo_description: payload.seo_description ?? "",
    features: payload.features!.map(f => f.text), specs: payload.specs!.map(s => ({ label: s.label ?? "", value_text: s.value_text ?? "" })) };
  return { ...draft, content, generatedCandidateSnapshot: createGeneratedSnapshot(draft.source, content),
    reviewedRevision: draft.row && draft.row.source_revision !== draft.source.translation_source_revision ? null : draft.reviewedRevision, message: "" };
}
