import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { careerPositions } from "@/lib/data/careers";
import type { CareerPosition } from "@/lib/data/careers";
import { groups as staticGroups } from "@/lib/data/groups";
import { partners as staticPartners } from "@/lib/data/partners";
import { brands as staticBrands } from "@/lib/data/brands";
import type { GroupCompany, Partner } from "@/types";

export interface PublicBrandItem {
  name: string;
  logoSrc: string;
  logoSrcDark?: string;
  /** Value used for ?brand= query param on /products */
  brandFilter: string;
}

const FALLBACK_BRAND_LOGO = "/images/brand/logo tekna web.png";

export const staticBrandItems: PublicBrandItem[] = staticBrands
  .map((b) => ({
    name: b.name,
    logoSrc: b.logoLight ?? b.logoDark ?? FALLBACK_BRAND_LOGO,
    logoSrcDark: b.logoDark ?? b.logoLight ?? FALLBACK_BRAND_LOGO,
    brandFilter: b.name,
  }))
  .filter((b) => b.logoSrc);

interface CareerRow {
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  type_badge_color: string;
  summary: string | null;
  description: string;
  responsibilities: unknown;
  requirements: unknown;
  benefits: unknown;
}

function toCareer(row: CareerRow): CareerPosition {
  return {
    slug: row.slug,
    title: row.title,
    department: row.department,
    location: row.location as CareerPosition["location"],
    type: row.type as CareerPosition["type"],
    typeBadgeColor:
      (row.type_badge_color as CareerPosition["typeBadgeColor"]) ?? "green",
    summary: row.summary ?? "",
    description: row.description ?? "",
    responsibilities: Array.isArray(row.responsibilities)
      ? (row.responsibilities as string[])
      : [],
    requirements: Array.isArray(row.requirements)
      ? (row.requirements as string[])
      : [],
    benefits: Array.isArray(row.benefits) ? (row.benefits as string[]) : [],
  };
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function listPublicCareers(): Promise<CareerPosition[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("careers")
    .select(
      "slug, title, department, location, type, type_badge_color, summary, description, responsibilities, requirements, benefits"
    )
    .eq("status", "open")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[public-data] careers", error);
    return careerPositions;
  }
  if (!data || data.length === 0) return [];
  return (data as unknown as CareerRow[]).map(toCareer);
}

export async function getPublicCareerBySlug(
  slug: string
): Promise<CareerPosition | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("careers")
    .select(
      "slug, title, department, location, type, type_badge_color, summary, description, responsibilities, requirements, benefits"
    )
    .eq("slug", slug)
    .eq("status", "open")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[public-data] career by slug", error);
    return careerPositions.find((c) => c.slug === slug) ?? null;
  }
  if (!data) return null;
  return toCareer(data as unknown as CareerRow);
}

interface GroupRow {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  url: string | null;
}

export async function listPublicGroups(): Promise<GroupCompany[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("group_companies")
    .select("id, name, legal_name, logo_url, url")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[public-data] groups", error);
    return staticGroups;
  }
  if (!data || data.length === 0) return [];
  return (data as unknown as GroupRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    legalName: r.legal_name ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    url: r.url ?? undefined,
  }));
}

interface PartnerRow {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  url: string | null;
}

export async function listPublicPartners(): Promise<Partner[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("partners")
    .select("id, name, short_name, logo_url, url")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[public-data] partners", error);
    return staticPartners;
  }
  if (!data || data.length === 0) return [];
  return (data as unknown as PartnerRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    shortName: r.short_name ?? r.name,
    logoUrl: r.logo_url ?? undefined,
    url: r.url ?? undefined,
  }));
}

interface BrandRow {
  name: string;
  logo_light: string | null;
  logo_dark: string | null;
}

export async function listPublicBrands(): Promise<PublicBrandItem[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, logo_light, logo_dark")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[public-data] brands", error);
    return staticBrandItems;
  }
  if (!data || data.length === 0) return staticBrandItems;
  const items = (data as unknown as BrandRow[])
    .map((r) => ({
      name: r.name,
      logoSrc: r.logo_light ?? r.logo_dark ?? FALLBACK_BRAND_LOGO,
      logoSrcDark: r.logo_dark ?? r.logo_light ?? FALLBACK_BRAND_LOGO,
      brandFilter: r.name,
    }))
    .filter((b) => b.logoSrc);
  return items.length > 0 ? items : staticBrandItems;
}

export async function getRecruitmentUrl(): Promise<string | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "recruitment")
    .maybeSingle();
  if (error || !data) return null;
  const value = (data as { value: unknown }).value as { url?: string } | null;
  const url = typeof value?.url === "string" ? value.url.trim() : "";
  return url || null;
}

export async function getWhatsAppNumber(): Promise<string | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "whatsapp")
    .maybeSingle();
  if (error || !data) return null;
  const value = (data as { value: unknown }).value as { number?: string } | null;
  const number = typeof value?.number === "string" ? value.number.trim() : "";
  return number || null;
}

export async function getBankAccount(): Promise<{
  bankName: string;
  accountNumber: string;
  accountHolder: string;
} | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_account")
    .maybeSingle();
  if (error || !data) return null;
  const value = (data as { value: unknown }).value as {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  } | null;
  const bankName = typeof value?.bankName === "string" ? value.bankName.trim() : "";
  const accountNumber = typeof value?.accountNumber === "string" ? value.accountNumber.trim() : "";
  const accountHolder = typeof value?.accountHolder === "string" ? value.accountHolder.trim() : "";
  if (!bankName && !accountNumber && !accountHolder) return null;
  return { bankName, accountNumber, accountHolder };
}
