import "server-only";
import { cookies } from "next/headers";
import { requireCapability } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { portfolioIdSchema } from "@/lib/validations/portfolioSchema";
import { safePortfolioImageUrl } from "@/lib/portfolio-media";
import type { PortfolioRow, PublicPortfolio } from "@/lib/portfolio-types";

const PUBLIC_COLUMNS = "id,title,summary,description,entry_kind,category_label,organization_name,image_url,image_alt,image_caption,sort_order";

export async function listAdminPortfolios(): Promise<PortfolioRow[]> {
  await requireCapability("content");
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("research_portfolios").select("*").order("sort_order").order("id");
  if (error) throw new Error("Gagal memuat portofolio. Pastikan migrasi 0065 telah diterapkan.");
  return (data ?? []) as PortfolioRow[];
}

export async function getAdminPortfolio(id: string): Promise<PortfolioRow | null> {
  await requireCapability("content");
  if (!portfolioIdSchema.safeParse(id).success) return null;
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("research_portfolios").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Gagal memuat entri portofolio.");
  return data as PortfolioRow | null;
}

export async function listPublishedPortfolios(): Promise<{ entries: PublicPortfolio[]; unavailable: boolean }> {
  try {
    const supabase = createClient(await cookies());
    // Even a signed-in Editor must only see Published content on the public page.
    const { data, error } = await supabase.from("research_portfolios").select(PUBLIC_COLUMNS)
      .eq("status", "published").order("sort_order").order("id");
    if (error) return { entries: [], unavailable: true };
    const entries = ((data ?? []) as PublicPortfolio[]).map(row => ({
      id: row.id, title: row.title, summary: row.summary, description: row.description,
      entry_kind: row.entry_kind, category_label: row.category_label, organization_name: row.organization_name,
      image_url: row.image_alt?.trim() ? safePortfolioImageUrl(row.image_url) : null,
      image_alt: row.image_alt, image_caption: row.image_caption, sort_order: row.sort_order,
    }));
    return { entries, unavailable: false };
  } catch { return { entries: [], unavailable: true }; }
}
