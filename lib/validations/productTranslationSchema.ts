import { z } from "zod";
import { productIdSchema } from "./productSchema";

const revision = z.number().int().min(1).max(2147483647);
export const productTranslationParentProofSchema = z.object({
  id: productIdSchema, status: z.literal("published"), is_active: z.literal(true),
  deleted_at: z.null(), translation_source_revision: revision,
}).strict();
export const productTranslationLocaleSchema = z.enum(["en", "zh-CN"]);
const status = z.enum(["draft", "published"]);
const text = (max: number) => z.string().trim().refine(value => [...value].length <= max, "Teks terlalu panjang.");
const nullableText = (max: number) => text(max).nullable().optional().transform(value => value || null);
const translatedSpec = z.object({ label: nullableText(500), value_text: nullableText(2000) }).strict();
const content = {
  name: nullableText(500),
  description: nullableText(20000),
  seo_title: nullableText(500),
  seo_description: nullableText(2000),
};

export const productTranslationPayloadSchema = z.object({
  ...content,
  features: z.array(z.object({ source_index: z.number().int().min(0), text: text(2000).min(1) }).strict()).max(1000).nullable().optional().default(null),
  specs: z.array(translatedSpec.extend({ source_index: z.number().int().min(0) }).strict()).max(1000).nullable().optional().default(null),
}).strict().refine(value => new TextEncoder().encode(JSON.stringify(value)).length <= 262144, "Payload terjemahan terlalu besar.");
export type ProductTranslationPayload = z.infer<typeof productTranslationPayloadSchema>;

export function hasProductTranslationContent(payload: {
  name?: string | null; description?: string | null; seo_title?: string | null; seo_description?: string | null;
  features?: unknown[] | null; specs?: { label?: string | null; value_text?: string | null }[] | null;
}) {
  return !!(payload.name || payload.description || payload.seo_title || payload.seo_description
    || payload.features?.length || payload.specs?.some(spec => spec.label || spec.value_text));
}

const identity = { productId: productIdSchema, locale: productTranslationLocaleSchema };
export const productTranslationSaveSchema = z.object({
  ...identity,
  payload: productTranslationPayloadSchema,
  status,
  expectedSourceRevision: revision,
  expectedTranslationVersion: revision.nullable(),
  expectedTranslationId: z.string().uuid().nullable().optional().default(null),
}).strict().refine(value => (value.expectedTranslationVersion == null) === (value.expectedTranslationId == null), {
  message: "Identitas dan versi terjemahan harus sesuai.", path: ["expectedTranslationId"],
}).refine(value => value.status !== "published" || hasProductTranslationContent(value.payload), {
  message: "Isi minimal satu bidang terjemahan sebelum publikasi.", path: ["payload"],
});
export const productTranslationMutationSchema = z.object({ ...identity, expectedTranslationVersion: revision, expectedTranslationId: z.string().uuid() }).strict();

export const productTranslationRowSchema = z.object({
  name: text(500).nullable().transform(value => value || null),
  description: text(20000).nullable().transform(value => value || null),
  seo_title: text(500).nullable().transform(value => value || null),
  seo_description: text(2000).nullable().transform(value => value || null),
  product_id: productIdSchema,
  locale: productTranslationLocaleSchema,
  status,
  source_revision: revision,
  features: z.array(text(2000).min(1)).max(1000).nullable(),
  specs: z.array(translatedSpec).max(1000).nullable(),
  id: z.string().uuid().optional(), version: revision.optional(),
  created_at: z.string().optional(), updated_at: z.string().optional(),
}).strict().refine(value => value.status !== "published" || hasProductTranslationContent(value), "Terjemahan publikasi kosong.");
