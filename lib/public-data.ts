import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { parseBankAccount, type BankAccount } from "@/lib/bank-account";
import type { CareerPosition } from "@/lib/data/careers";
import { groups as staticGroups } from "@/lib/data/groups";
import { partners as staticPartners } from "@/lib/data/partners";
import { brands as staticBrands } from "@/lib/data/brands";
import { teamMembers as staticTeamMembers } from "@/lib/data/team";
import type { GroupCompany, Partner, TeamMember } from "@/types";
import type { DistributionEntity, DistributionType } from "@/types";
import { verifiedGroupDistribution } from "@/lib/data/distribution";
import { HERO_MAIN_BRAND_IDS, heroSlidesReadSchema } from "@/lib/validations/heroSchema";
import { logError } from "@/lib/logger";
import type { ProductRow } from "@/lib/admin-data";
import {
  parseWhatsAppContacts,
  resolveWhatsAppContact,
  resolveWhatsAppContacts,
  type CommunicationIntent,
  type ResolvedWhatsAppContacts,
  type WhatsAppContact,
} from "@/lib/communication";
import {
  filterMikaJobs,
  getMikaJobs,
  legacyCareersToMikaJobs,
} from "@/lib/api/mika-career";
import type { MikaJob, MikaJobQueryParams, MikaJobsResponse } from "@/types/mika-career";
import { getSafeExternalUrl } from "@/lib/public-url";

export type { ProductRow };

export interface PublicBrandItem {
  name: string;
  logoSrc: string;
  logoSrcDark?: string;
  /** Value used for ?brand= query param on /products */
  brandFilter: string;
}

export const staticBrandItems: PublicBrandItem[] = staticBrands
  .map((b) => ({
    name: b.name,
    logoSrc: b.logoLight ?? b.logoDark ?? "",
    logoSrcDark: b.logoDark ?? b.logoLight ?? "",
    brandFilter: b.name,
  }));

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

export async function listPublicProductsByType(): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "b2b_system")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    logError("listPublicProductsByType", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

export async function getPublicProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("product_type", "b2b_system")
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    logError("getPublicProductBySlug", error);
    return null;
  }
  return data as ProductRow | null;
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
    return [];
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
    return null;
  }
  if (!data) return null;
  return toCareer(data as unknown as CareerRow);
}

export interface PublicCareerListings {
  response: MikaJobsResponse;
  fallbackJobs: MikaJob[];
  source: "mika" | "supabase" | "empty";
}

export async function getPublicCareerListings(
  params: MikaJobQueryParams = {},
): Promise<PublicCareerListings> {
  const [mikaResponse, legacyCareers] = await Promise.all([
    getMikaJobs(params),
    listPublicCareers(),
  ]);
  const fallbackJobs = legacyCareersToMikaJobs(legacyCareers);

  if (mikaResponse.success) {
    return { response: mikaResponse, fallbackJobs, source: "mika" };
  }

  const fallbackResponse = filterMikaJobs(
    fallbackJobs,
    params,
    fallbackJobs.length > 0
      ? "Mika Career tidak tersedia; menampilkan lowongan AKA"
      : "Belum ada lowongan yang tersedia",
  );
  return {
    response: fallbackResponse,
    fallbackJobs,
    source: fallbackJobs.length > 0 ? "supabase" : "empty",
  };
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

interface DistributionRow {
  id: string;
  name: string;
  legal_name: string | null;
  short_name: string | null;
  distribution_type: DistributionType;
  parent_id: string | null;
  market_segment: string | null;
  region_label: string | null;
  city: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  contact_name: string | null;
  logo_url: string | null;
  description: string | null;
  sort_order: number;
}

export async function listPublicDistributionEntities(): Promise<DistributionEntity[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("distribution_entities")
    .select(
      "id, name, legal_name, short_name, distribution_type, parent_id, market_segment, region_label, city, province, address, phone, email, website_url, contact_name, logo_url, description, sort_order",
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    logError("listPublicDistributionEntities", error);
    return verifiedGroupDistribution;
  }

  return ((data ?? []) as DistributionRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    shortName: row.short_name,
    distributionType: row.distribution_type,
    parentId: row.parent_id,
    marketSegment: row.market_segment,
    regionLabel: row.region_label,
    city: row.city,
    province: row.province,
    address: row.address,
    phone: row.phone,
    email: row.email,
    websiteUrl: row.website_url,
    contactName: row.contact_name,
    logoUrl: row.logo_url,
    description: row.description,
    sortOrder: row.sort_order,
  }));
}

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  role_color: string | null;
  bio: string | null;
  image_url: string | null;
}

export async function listPublicTeamMembers(): Promise<TeamMember[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, role, role_color, bio, image_url")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[public-data] team_members", error);
    return staticTeamMembers;
  }
  if (!data || data.length === 0) return [];
  return (data as unknown as TeamMemberRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    roleColor: r.role_color ?? "teal",
    bio: r.bio ?? "",
    imageUrl: r.image_url ?? undefined,
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
      logoSrc: r.logo_light ?? r.logo_dark ?? "",
      logoSrcDark: r.logo_dark ?? r.logo_light ?? "",
      brandFilter: r.name,
    }));
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
  return getSafeExternalUrl(value?.url);
}

async function getWhatsAppSettingValue(): Promise<unknown | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "whatsapp")
    .maybeSingle();
  if (error || !data) return null;
  return (data as { value: unknown }).value;
}

export async function getWhatsAppContact(intent: CommunicationIntent): Promise<WhatsAppContact | null> {
  const value = await getWhatsAppSettingValue();
  return resolveWhatsAppContact(parseWhatsAppContacts(value), intent);
}

export async function getWhatsAppContacts(): Promise<ResolvedWhatsAppContacts> {
  const value = await getWhatsAppSettingValue();
  return resolveWhatsAppContacts(value);
}

export async function getOwnedLegacyTransferBankAccount(orderCode: string): Promise<BankAccount | null> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ownedTransferOrder, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("order_code", orderCode)
    .eq("user_id", user.id)
    .eq("payment_method", "transfer")
    .is("deleted_at", null)
    .maybeSingle();
  if (orderError || !ownedTransferOrder) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "bank_account")
    .maybeSingle();
  if (error || !data) return null;
  return parseBankAccount((data as { value: unknown }).value);
}

export async function getCompanyContact(): Promise<{
  address: string;
  email: string;
  phone: string;
  mapsQuery: string;
  mapEmbed: string;
} | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "contact")
    .maybeSingle();
  if (error || !data) return null;
  const value = (data as { value: unknown }).value as {
    address?: string;
    email?: string;
    phone?: string;
    mapsQuery?: string;
    mapEmbed?: string;
  } | null;
  const address = typeof value?.address === "string" ? value.address.trim() : "";
  const email = typeof value?.email === "string" ? value.email.trim() : "";
  const phone = typeof value?.phone === "string" ? value.phone.trim() : "";
  const mapsQuery = typeof value?.mapsQuery === "string" ? value.mapsQuery.trim() : "";
  const mapEmbed = typeof value?.mapEmbed === "string" ? value.mapEmbed.trim() : "";
  if (!address && !email && !phone) return null;
  return { address, email, phone, mapsQuery, mapEmbed };
}

export interface HeroSlideResolved {
  key: string;
  badge: string;
  subtitle: string;
  ctaLink: string | null;
  ctaLabel: string;
  productImage: string | null;
  productName: string;
  accentColor: string;
  isCompanyFallback: boolean;
}

const COMPANY_HERO_FALLBACK: HeroSlideResolved[] = [
  {
    key: "company",
    badge: "Perusahaan Manufaktur",
    subtitle: "Produsen produk teknologi industri Indonesia.",
    ctaLink: "/products",
    ctaLabel: "Lihat Produk",
    productImage: null,
    productName: "PT Autentik Karya Analitika",
    accentColor: "#0EA5A0",
    isCompanyFallback: true,
  },
];

function safeBrandColor(value: string | null): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#0EA5A0";
}

export async function getHomepageFeaturedProducts(): Promise<ProductRow[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "home_hero")
      .maybeSingle();
    if (error || !data) return [];

    const value = (data as { value: unknown }).value;
    const parsed = heroSlidesReadSchema.safeParse(value);
    if (!parsed.success || parsed.data.slides.length === 0) return [];

    const productIds = [...new Set(parsed.data.slides.map((slide) => slide.productId))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("product_type", "b2b_system")
      .eq("status", "published")
      .eq("is_active", true)
      .in("brand_id", HERO_MAIN_BRAND_IDS)
      .is("deleted_at", null);
    if (productsError) return [];

    const productMap = new Map((products ?? []).map((product) => [product.id, product as ProductRow]));
    const selectedBrands = new Set<string>();
    return parsed.data.slides.flatMap((slide): ProductRow[] => {
      const product = productMap.get(slide.productId);
      const brandId = product?.brand_id;
      if (!product || !brandId || selectedBrands.has(brandId)) return [];
      selectedBrands.add(brandId);
      return [product];
    });
  } catch (err) {
    logError("getHomepageFeaturedProducts", err);
    return [];
  }
}

export function resolveHeroSlides(products: ProductRow[]): HeroSlideResolved[] {
  const resolved = products.map((product): HeroSlideResolved => ({
    key: product.id,
    badge: product.brand || "Produk Unggulan",
    subtitle: product.description ?? "",
    ctaLink: `/products/${product.slug}`,
    ctaLabel: "Lihat Produk",
    productImage: product.image_url ?? null,
    productName: product.name,
    accentColor: safeBrandColor(product.brand_color ?? null),
    isCompanyFallback: false,
  }));
  return resolved.length > 0 ? resolved : COMPANY_HERO_FALLBACK;
}
