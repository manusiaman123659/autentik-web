import { z } from "zod";
import { productIdSchema } from "./validations/productSchema";
import { productTranslationLocaleSchema, productTranslationPayloadSchema, type ProductTranslationPayload } from "./validations/productTranslationSchema";
import { validateProductTranslationBlocks } from "./product-translations";
import type { ProductTranslationLocale } from "./product-translation-types";
import type { EditorSource, LocaleContent, LocaleDraft } from "./product-translation-editor";

export const GENERATION_LIMITS = Object.freeze({ codePoints: 25000, slots: 256, requestBytes: 131072, deadlineMs: 45000, maxOutputTokens: 32768 });
export type GenerationErrorCode = "not_configured" | "configuration" | "auth" | "quota" | "unavailable" | "timeout" | "aborted" | "invalid_response" | "source_invalid" | "source_changed" | "source_unavailable" | "unsupported_product" | "size" | "busy" | "rate";
const MESSAGES: Record<GenerationErrorCode, string> = {
  not_configured: "Layanan draf AI belum dikonfigurasi.",
  configuration: "Konfigurasi layanan draf AI belum valid. Hubungi pengelola sistem.",
  auth: "Layanan draf AI belum dapat diakses. Hubungi pengelola sistem.",
  quota: "Kuota layanan draf AI sedang habis. Gunakan editor manual atau coba lagi nanti.",
  unavailable: "Layanan draf AI belum tersedia. Gunakan editor manual atau coba lagi nanti.",
  timeout: "Pembuatan draf AI melewati batas waktu. Perubahan lokal tetap dipertahankan.",
  aborted: "Pembuatan draf AI dibatalkan. Perubahan lokal tetap dipertahankan.",
  invalid_response: "Hasil draf AI tidak lengkap atau tidak valid. Perubahan lokal tetap dipertahankan.",
  source_invalid: "Struktur atau panjang konten Indonesia tidak valid untuk draf AI. Periksa Konten Utama atau gunakan editor manual.",
  source_changed: "Konten Indonesia berubah. Muat ulang data sebelum membuat draf AI.",
  source_unavailable: "Produk tidak tersedia atau sudah diarsipkan. Muat ulang halaman.",
  unsupported_product: "Draf AI hanya tersedia untuk produk B2B.",
  size: "Konten terlalu besar untuk draf AI. Gunakan editor manual atau ringkas konten sumber.",
  busy: "Draf bahasa ini sedang dibuat. Tunggu hingga proses selesai.",
  rate: "Terlalu banyak permintaan draf AI. Tunggu 10 menit atau gunakan editor manual.",
};
export class GenerationError extends Error {
  constructor(public readonly code: GenerationErrorCode) { super(MESSAGES[code]); this.name = "GenerationError"; }
}
export const generationRequestSchema = z.object({ productId: productIdSchema, locale: productTranslationLocaleSchema, expectedSourceRevision: z.number().int().min(1).max(2147483647) }).strict();
const completePayload = z.custom<unknown>(v => !!v && typeof v === "object" && ["name", "description", "features", "specs", "seo_title", "seo_description"].every(k => Object.hasOwn(v, k)))
  .pipe(productTranslationPayloadSchema).refine(v => Array.isArray(v.features) && Array.isArray(v.specs), "Hasil blok draf AI harus lengkap.");
export const generationCandidateSchema = z.object({ productId: productIdSchema, locale: productTranslationLocaleSchema, sourceRevision: z.number().int().min(1).max(2147483647), payload: completePayload }).strict();
export type GenerationCandidate = z.infer<typeof generationCandidateSchema>;
export const AI_TARGET_LANGUAGES = { en: "English", "zh-CN": "Simplified Chinese" } as const;

const specification = z.object({ label: z.string(), value: z.string(), value_kind: z.enum(["technical", "text"]).optional() });
// Control characters only; tab, LF and CR are legitimate inside product prose.
const unsafeControl = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u;
const MAXIMUM = { name: 500, description: 20000, feature: 2000, specLabel: 500, specValue: 2000, seoTitle: 500, seoDescription: 2000 } as const;
const REQUIRED_KEYS = ["name", "description", "features", "specs", "seo_title", "seo_description"] as const;

export interface GenerationSourceText {
  readonly name: string; readonly description: string; readonly seo_title: string | null; readonly seo_description: string | null;
  readonly features: readonly string[];
  readonly specs: readonly { readonly label: string; readonly value: string; readonly value_kind: "text" | "technical" }[];
}
export interface GenerationRequest {
  readonly source: EditorSource;
  readonly locale: ProductTranslationLocale;
  readonly target: string;
  readonly payload: { readonly target_language: string; readonly source: GenerationSourceText };
  readonly codePoints: number;
}

export function buildGenerationSource(source: EditorSource, locale: ProductTranslationLocale): GenerationRequest {
  if (source.product_type !== "b2b_system") throw new GenerationError("unsupported_product");
  const features = z.array(z.string()).max(1000).safeParse(source.features);
  const specs = z.array(specification).max(1000).safeParse(source.specs);
  if (!features.success || !specs.success || features.data.some(feature => !feature.trim())) throw new GenerationError("source_invalid");
  let slots = 0; let total = 0;
  const measure = (text: string | null, maximum: number) => {
    if (text === null || !text.trim()) return;
    if ([...text].length > maximum || unsafeControl.test(text)) throw new GenerationError("source_invalid");
    slots++; total += [...text].length;
    if (total > GENERATION_LIMITS.codePoints || slots > GENERATION_LIMITS.slots) throw new GenerationError("size");
  };
  measure(source.name, MAXIMUM.name); measure(source.description, MAXIMUM.description);
  features.data.forEach(feature => measure(feature, MAXIMUM.feature));
  specs.data.forEach(spec => { measure(spec.label, MAXIMUM.specLabel); if (spec.value_kind === "text") measure(spec.value, MAXIMUM.specValue); });
  measure(source.seo_title, MAXIMUM.seoTitle); measure(source.seo_description, MAXIMUM.seoDescription);
  if (!slots) throw new GenerationError("source_invalid");
  const target = AI_TARGET_LANGUAGES[locale];
  // Request-side exclusion: technical/missing-kind spec values are never serialized; mapGenerationResponse separately forces their output to null.
  return {
    source, locale, target, codePoints: total,
    payload: {
      target_language: target,
      source: {
        name: source.name ?? "", description: source.description ?? "",
        seo_title: source.seo_title?.trim() ? source.seo_title : null,
        seo_description: source.seo_description?.trim() ? source.seo_description : null,
        features: features.data,
        specs: specs.data.map(spec => ({ label: spec.label, value: spec.value_kind === "text" ? spec.value : "", value_kind: spec.value_kind === "text" ? "text" : "technical" })),
      },
    },
  };
}

export function mapGenerationResponse(request: GenerationRequest, raw: unknown): ProductTranslationPayload {
  const features = z.array(z.string()).max(1000).safeParse(request.source.features);
  const specs = z.array(specification).max(1000).safeParse(request.source.specs);
  if (!features.success || !specs.success) throw new GenerationError("source_invalid");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new GenerationError("invalid_response");
  const record = raw as Record<string, unknown>;
  if (Object.keys(record).length !== REQUIRED_KEYS.length || !REQUIRED_KEYS.every(key => Object.hasOwn(record, key))) throw new GenerationError("invalid_response");
  // Canonical source wins: a blank source field becomes null, a technical value is never translated.
  const translated = (value: unknown, sourceText: string | null | undefined): string | null => {
    if (typeof value !== "string" || unsafeControl.test(value)) throw new GenerationError("invalid_response");
    if (!sourceText?.trim()) return null;
    if (!value.trim()) throw new GenerationError("invalid_response");
    return value;
  };
  const entry = (value: unknown, index: number): Record<string, unknown> | null =>
    value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).source_index === index ? value as Record<string, unknown> : null;
  const blocks = record.features; const specifications = record.specs;
  if (!Array.isArray(blocks) || blocks.length !== features.data.length || !Array.isArray(specifications) || specifications.length !== specs.data.length) throw new GenerationError("invalid_response");
  const payload = {
    name: translated(record.name, request.source.name),
    description: translated(record.description, request.source.description),
    seo_title: translated(record.seo_title, request.source.seo_title),
    seo_description: translated(record.seo_description, request.source.seo_description),
    features: blocks.map((block, index) => {
      const item = entry(block, index); if (!item) throw new GenerationError("invalid_response");
      const text = translated(item.text, features.data[index]); if (text === null) throw new GenerationError("invalid_response");
      return { source_index: index, text };
    }),
    specs: specifications.map((block, index) => {
      const item = entry(block, index); if (!item) throw new GenerationError("invalid_response");
      const original = specs.data[index];
      return {
        source_index: index,
        label: translated(item.label, original.label),
        value_text: original.value_kind === "text" ? translated(item.value_text, original.value) : null,
      };
    }),
  };
  const parsed = productTranslationPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new GenerationError("invalid_response");
  if (!validateProductTranslationBlocks({ ...request.source, features: features.data, specs: specs.data }, parsed.data)) throw new GenerationError("invalid_response");
  return parsed.data;
}

export function abortGeneration(signal: AbortSignal): never {
  throw new GenerationError(signal.reason?.name === "TimeoutError" ? "timeout" : "aborted");
}

export interface NormalizedEditableContent {
  readonly name: string | null; readonly description: string | null; readonly seo_title: string | null; readonly seo_description: string | null;
  readonly features: readonly string[] | null;
  readonly specs: readonly Readonly<{ label: string | null; value_text: string | null }>[] | null;
}
const nullable = (v: unknown) => typeof v === "string" ? v.trim() || null : null;
export function normalizeEditableContent(source: EditorSource, content: LocaleContent): NormalizedEditableContent {
  return {
    name: nullable(content.name), description: nullable(content.description), seo_title: nullable(content.seo_title), seo_description: nullable(content.seo_description),
    features: Array.isArray(content.features) && content.features.length ? content.features.map(v => typeof v === "string" ? v.trim() : "") : null,
    specs: Array.isArray(content.specs) && content.specs.length ? content.specs.map((v, index) => ({ label: nullable(v?.label), value_text: Array.isArray(source.specs) && source.specs[index]?.value_kind === "text" ? nullable(v?.value_text) : null })) : null,
  };
}
export function createGeneratedSnapshot(source: EditorSource, content: LocaleContent): NormalizedEditableContent {
  const normalized = normalizeEditableContent(source, content);
  if (normalized.features) Object.freeze(normalized.features);
  if (normalized.specs) { normalized.specs.forEach(Object.freeze); Object.freeze(normalized.specs); }
  return Object.freeze(normalized);
}
export function machineGeneratedUntouched(draft: LocaleDraft): boolean {
  return draft.generatedCandidateSnapshot !== undefined && JSON.stringify(normalizeEditableContent(draft.source, draft.content)) === JSON.stringify(draft.generatedCandidateSnapshot);
}
