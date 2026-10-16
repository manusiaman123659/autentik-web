"use server";

import { cookies } from "next/headers";
import { requireOperationalStaff } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit, logError } from "@/lib/logger";
import { parseEditorSnapshot, type EditorSource } from "@/lib/product-translation-editor";
import { generateDraftWithGemini } from "@/lib/product-translation-ai";
import { generationRequestSchema, generationCandidateSchema, buildGenerationSource, mapGenerationResponse, GenerationError, GENERATION_LIMITS, abortGeneration, type GenerationErrorCode } from "@/lib/product-translation-generation";
import type { ActionResult } from "./products";

const SOURCE_COLUMNS = "id,slug,product_type,name,description,features,specs,seo_title,seo_description,translation_source_revision,status,is_active,deleted_at";
// Best-effort per-process guard; the Gemini quota provides the cross-worker spend ceiling.
const inFlight = new Set<string>();
async function readSource(client: ReturnType<typeof createClient>, id: string, signal: AbortSignal): Promise<EditorSource> {
  const { data, error } = await client.from("products").select(SOURCE_COLUMNS).eq("id", id).is("deleted_at", null).abortSignal(signal).maybeSingle();
  if (signal.aborted) abortGeneration(signal);
  if (error || !data) throw new GenerationError("source_unavailable");
  let source: EditorSource;
  try { source = parseEditorSnapshot(data, []).source; } catch { throw new GenerationError("source_invalid"); }
  if (source.id !== id) throw new GenerationError("source_unavailable");
  if (source.product_type !== "b2b_system") throw new GenerationError("unsupported_product");
  return source;
}
export async function generateProductTranslationDraft(input: unknown): Promise<ActionResult & { code?: GenerationErrorCode | "unauthorized" | "invalid_input"; candidate?: import("@/lib/product-translation-generation").GenerationCandidate }> {
  let productId: string | undefined; let locale: string | undefined; let sourceRevision: number | undefined;
  let codePoints = 0; const start = performance.now();
  try {
    const actor = await requireOperationalStaff();
    if (!actor) return { success: false, message: "Anda tidak memiliki akses.", code: "unauthorized" };
    const parsed = generationRequestSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Permintaan draf AI tidak valid.", code: "invalid_input" };
    ({ productId, locale, expectedSourceRevision: sourceRevision } = parsed.data);
    const lock = `${actor.id}:${productId}:${locale}`;
    if (inFlight.has(lock)) throw new GenerationError("busy");
    inFlight.add(lock);
    const signal = AbortSignal.timeout(GENERATION_LIMITS.deadlineMs);
    try {
      const client = createClient(await cookies());
      const source = await readSource(client, productId, signal);
      if (source.translation_source_revision !== sourceRevision) throw new GenerationError("source_changed");
      const prepared = buildGenerationSource(source, parsed.data.locale); codePoints = prepared.codePoints;
      if (!checkRateLimit(`product-translation-ai:${actor.id}`, 6, 600000).allowed) throw new GenerationError("rate");
      const payload = mapGenerationResponse(prepared, await generateDraftWithGemini(prepared, signal));
      const candidate = generationCandidateSchema.safeParse({ productId, locale: parsed.data.locale, sourceRevision, payload });
      if (!candidate.success) throw new GenerationError("invalid_response");
      const fresh = await readSource(client, productId, signal);
      if (fresh.translation_source_revision !== sourceRevision) throw new GenerationError("source_changed");
      logAudit("product.translation.generated", "product", productId, { locale, sourceRevision, codePoints, durationMs: Math.round(performance.now() - start) });
      return { success: true, message: "Draf AI dimuat sebagai kandidat. Tinjau dan edit sebelum menyimpan.", candidate: candidate.data };
    } finally { inFlight.delete(lock); }
  } catch (error) {
    const safe = error instanceof GenerationError ? error : new GenerationError("unavailable");
    logError("product.translation.generate", "Pembuatan draf AI ditolak atau gagal.", { category: safe.code, productId, locale, sourceRevision, codePoints, durationMs: Math.round(performance.now() - start) });
    return { success: false, message: safe.message, code: safe.code };
  }
}
