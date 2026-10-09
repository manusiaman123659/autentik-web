"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireContentManager } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { recordAudit } from "@/lib/audit";
import { portfolioSchema, portfolioIdSchema, portfolioStatusSchema } from "@/lib/validations/portfolioSchema";
import type { ActionResult } from "./products";

function refreshRoutes(id: string) {
  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/portfolio/${id}`);
  revalidatePath("/research-partnership");
}

export async function savePortfolio(input: unknown): Promise<ActionResult> {
  const admin = await requireContentManager();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };
  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) return {
    success: false, message: "Periksa kembali isian form.",
    errors: Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])),
  };
  const value = parsed.data;
  const supabase = createClient(await cookies());
  let status = value.status;
  if (value.id && typeof input === "object" && input !== null && (!("status" in input) || input.status === undefined)) {
    const existing = await supabase.from("research_portfolios").select("status").eq("id", value.id).maybeSingle();
    if (existing.error || !existing.data) return { success: false, message: "Entri tidak ditemukan atau tidak dapat dibaca." };
    status = existing.data.status;
    const check = portfolioSchema.safeParse({ ...value, status });
    if (!check.success) return { success: false, message: "Ringkasan dan teks alternatif wajib lengkap untuk entri Published." };
  }
  const record = {
    title: value.title, summary: value.summary, description: value.description,
    entry_kind: value.entryKind, category_label: value.categoryLabel, organization_name: value.organizationName,
    image_url: value.imageUrl, image_alt: value.imageAlt, image_caption: value.imageCaption,
    source_reference: value.sourceReference, status, sort_order: value.sortOrder,
  };
  // Explicit INSERT for create and UPDATE by immutable UUID for edit; never title-based upsert.
  const query = value.id
    ? supabase.from("research_portfolios").update(record).eq("id", value.id)
    : supabase.from("research_portfolios").insert(record);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Gagal menyimpan portofolio. Entri mungkin telah dihapus; muat ulang halaman." };
  await recordAudit(value.id ? "portfolio.updated" : "portfolio.created", "research_portfolio", data.id, { title: value.title, status });
  refreshRoutes(data.id);
  return { success: true, message: value.id ? "Portofolio berhasil diperbarui." : "Portofolio berhasil ditambahkan." };
}

export async function setPortfolioStatus(id: string, status: unknown): Promise<ActionResult> {
  const admin = await requireContentManager();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };
  const parsed = portfolioStatusSchema.safeParse(status);
  if (!portfolioIdSchema.safeParse(id).success || !parsed.success) return { success: false, message: "ID atau status tidak valid." };
  const supabase = createClient(await cookies());
  // DB CHECK constraints also enforce Published summary and image-alt completeness.
  const { data, error } = await supabase.from("research_portfolios").update({ status: parsed.data }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Gagal mengubah status. Pastikan entri tersedia, ringkasan terisi, dan gambar memiliki teks alternatif." };
  await recordAudit("portfolio.status_changed", "research_portfolio", id, { status: parsed.data });
  refreshRoutes(id);
  return { success: true, message: parsed.data === "published" ? "Entri dipublikasikan." : "Entri dikembalikan ke Draft." };
}

export async function deletePortfolio(id: string): Promise<ActionResult> {
  const admin = await requireContentManager();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };
  if (!portfolioIdSchema.safeParse(id).success) return { success: false, message: "ID entri tidak valid." };
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("research_portfolios").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Entri tidak ditemukan atau gagal dihapus." };
  // Image objects may be shared by multiple entries; deliberately retain them.
  await recordAudit("portfolio.deleted", "research_portfolio", id, { id });
  refreshRoutes(id);
  return { success: true, message: "Entri berhasil dihapus permanen." };
}
