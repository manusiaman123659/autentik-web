import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { OrderStatus } from "@/lib/validations/storeSchema";
import { ORDER_DEFAULT_PAGE_SIZE } from "@/lib/validations/storeSchema";
import type { ComproSettings } from "@/lib/validations/comproSchema";
import { heroSlidesReadSchema, type HeroSlideInput } from "@/lib/validations/heroSchema";
import { getAdminUser } from "@/lib/admin";
import { parseBankAccount, type BankAccount } from "@/lib/bank-account";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  product_type: "b2b_system" | "sparepart";
  sku?: string | null;
  brand: string;
  brand_id?: string | null;
  brand_color?: string | null;
  category: string;
  category_color?: string | null;
  fulfillment_type?: "ready_stock" | "custom_request" | "third_party" | null;
  description: string;
  features?: unknown[];
  specs?: { label: string; value: string }[];
  image_url?: string | null;
  gallery?: string[] | null;
  brochure_url?: string | null;
  model_3d_url?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  stock?: number | null;
  low_stock_threshold?: number | null;
  variants?: { name: string; options: string[] }[];
  is_active?: boolean | null;
  is_store_visible?: boolean | null;
  status?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  related_ids?: string[] | null;
  deleted_at?: string | null;
  has_active_variants?: boolean;
}

export interface OrderRow {
  id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: Record<string, unknown> | null;
  subtotal: number;
  shipping_cost: number;
  shipping_total_weight_g?: number | null;
  shipping_zone_id?: string | null;
  shipping_rate_id?: string | null;
  total: number;
  payment_method?: string | null;
  payment_status?: string | null;
  status: OrderStatus;
  tracking_courier?: string | null;
  tracking_number?: string | null;
  notes?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  deleted_at?: string | null;
  paid_at?: string | null;
  midtrans_order_id?: string | null;
  midtrans_redirect_url?: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  variant_label?: string | null;
  product_name: string;
  sku?: string | null;
  variant?: Record<string, unknown> | null;
  unit_price: number;
  quantity: number;
  weight_grams: number;
}

export interface ContactMessageRow {
  id: string;
  full_name: string;
  email: string;
  company?: string | null;
  industry?: string | null;
  message: string;
  category?: "general" | "custom_request" | null;
  product_name?: string | null;
  product_slug?: string | null;
  is_read: boolean;
  status?: string | null;
  created_at: string;
}

export interface LeadRow {
  id: string;
  source?: string | null;
  product_slug?: string | null;
  page_path?: string | null;
  target_phone?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  created_at: string;
}

export interface AuditRow {
  id: string;
  user_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: unknown | null;
  created_at: string;
}

export interface StaffRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role: "admin" | "editor";
  is_active: boolean;
  created_at: string;
}

export interface RfqRow {
  id: string;
  rfq_code: string;
  product_id: string | null;
  company_name: string;
  pic_name: string;
  email: string;
  phone_number: string;
  estimated_quantity: number;
  target_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  product_name?: string | null;
  deleted_at?: string | null;
}

export interface TechDocRow {
  id: string;
  product_id: string;
  title: string;
  file_type: string;
  file_url: string | null;
  storage_path: string | null;
  file_size_kb: number | null;
  requires_lead: boolean;
  created_at: string;
}

const DEFAULT_COMPRO: ComproSettings = {
  title: "Company Profile AKA 2026",
  year: "2026",
  pdfUrl: null,
  pdfFilename: null,
};

export async function getComproSettings(): Promise<ComproSettings> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "compro")
    .maybeSingle();
  if (error || !data) return DEFAULT_COMPRO;
  const value = (data as { value: Record<string, unknown> }).value;
  if (!value || typeof value !== "object") return DEFAULT_COMPRO;
  return {
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : DEFAULT_COMPRO.title,
    year: typeof value.year === "string" && value.year ? value.year : null,
    pdfUrl: typeof value.pdfUrl === "string" && value.pdfUrl ? value.pdfUrl : null,
    pdfFilename:
      typeof value.pdfFilename === "string" && value.pdfFilename
        ? value.pdfFilename
        : null,
  };
}

export async function getHeroSlidesSettings(): Promise<HeroSlideInput[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "home_hero")
    .maybeSingle();
  if (error || !data) return [];
  const parsed = heroSlidesReadSchema.safeParse((data as { value: unknown }).value);
  return parsed.success ? parsed.data.slides : [];
}

export async function getRecruitmentUrlSetting(): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "recruitment")
    .maybeSingle();
  if (error || !data) return "";
  const value = (data as { value: Record<string, unknown> }).value;
  if (!value || typeof value !== "object") return "";
  return typeof value.url === "string" && value.url ? value.url : "";
}

export async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function fmtRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export { fmtRp };

export async function getDashboardStats() {
  const supabase = await getSupabase();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();

  const [pending, revenue, unread, lowStock] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact" }).in("payment_status", ["pending"]).is("deleted_at", null),
    supabase
      .from("orders")
      .select("total")
      .in("payment_status", ["paid"])
      .gte("created_at", iso)
      .is("deleted_at", null),
    supabase.from("contact_messages").select("id", { count: "exact" }).eq("is_read", false),
    supabase
      .from("products")
      .select("id, stock, low_stock_threshold")
      .eq("product_type", "sparepart")
      .is("deleted_at", null),
  ]);

  const revenueTotal = Array.isArray(revenue.data)
    ? (revenue.data as { total: number }[]).reduce((acc, r) => acc + (Number(r.total) || 0), 0)
    : 0;

  const lowStockData = (lowStock.data ?? []) as { id: string; stock: number; low_stock_threshold: number }[];
  const lowStockTotal = lowStockData.filter(
    (p) => (p.stock ?? 0) <= (p.low_stock_threshold ?? 5)
  ).length;

  return {
    pendingOrders: pending.count ?? 0,
    revenueThisMonth: revenueTotal,
    unreadMessages: unread.count ?? 0,
    lowStockCount: lowStockTotal,
  };
}

export async function getRecentOrders(limit = 5): Promise<OrderRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-data] recent orders", error);
    return [];
  }
  return (data ?? []) as OrderRow[];
}

export async function getRecentMessages(limit = 5): Promise<ContactMessageRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-data] recent messages", error);
    return [];
  }
  return (data ?? []) as ContactMessageRow[];
}

export type OrderListFilter = OrderStatus | "all" | "reconciliation";

export interface ListOrdersParams {
  status?: OrderListFilter;
  page?: number; // 1-based
  pageSize?: number; // default ORDER_DEFAULT_PAGE_SIZE
}

export async function listOrders(params: ListOrdersParams = {}): Promise<{ orders: OrderRow[]; total: number }> {
  const supabase = await getSupabase();
  const status = params.status ?? "all";
  const pageSize = params.pageSize ?? ORDER_DEFAULT_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (status === "reconciliation") {
    query = query.eq("status", "cancelled").eq("payment_status", "paid");
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin-data] orders", error);
    return { orders: [], total: 0 };
  }
  return { orders: (data ?? []) as OrderRow[], total: count ?? 0 };
}

export async function getOrder(id: string) {
  const supabase = await getSupabase();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  return { order: order as OrderRow, items: (items ?? []) as OrderItemRow[] };
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin-data] messages", error);
    return [];
  }
  return (data ?? []) as ContactMessageRow[];
}

export async function listLeads(): Promise<LeadRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin-data] leads", error);
    return [];
  }
  return (data ?? []) as LeadRow[];
}

export async function listRfq(): Promise<RfqRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("quotation_requests")
    .select("*, products!quotation_requests_product_id_fkey(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin-data] rfq", error);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    product_name: (row.products as { name?: string } | null)?.name ?? null,
  })) as RfqRow[];
}

export async function listTechnicalDocuments(productId: string): Promise<TechDocRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("technical_documents")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[admin-data] technical documents", error);
    return [];
  }
  return (data ?? []) as TechDocRow[];
}

export interface HotspotRow {
  id: string;
  product_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function getProductHotspots(productId: string): Promise<HotspotRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("product_hotspots")
    .select("*")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] product hotspots", error);
    return [];
  }
  return (data ?? []) as HotspotRow[];
}

export interface PhotoHotspotRow {
  id: string;
  product_id: string;
  target_image_url: string;
  position_x: number;
  position_y: number;
  title: string;
  description: string | null;
  callout_image_url: string;
  sort_order: number;
  is_active: boolean;
}

export async function getProductPhotoHotspots(productId: string): Promise<PhotoHotspotRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("product_photo_hotspots")
    .select("*")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] product photo hotspots", error);
    return [];
  }
  return (data ?? []) as PhotoHotspotRow[];
}

export async function listStaff(): Promise<StaffRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .in("role", ["admin", "editor"])
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin-data] staff", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    if (row.role !== "admin" && row.role !== "editor") return [];
    return [{ ...row, role: row.role }];
  });
}

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-data] audit", error);
    return [];
  }
  return (data ?? []) as AuditRow[];
}

export async function listProductsByType(
  productType: "b2b_system" | "sparepart",
  query?: string,
  options: { includeArchived?: boolean } = {}
): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  let builder = supabase
    .from("products")
    .select("*")
    .eq("product_type", productType);
  if (!options.includeArchived) {
    builder = builder.is("deleted_at", null);
  }
  builder = builder.order("sort_order", { ascending: true });
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    builder = builder.or(`name.ilike.${q},slug.ilike.${q},brand.ilike.${q}`);
  }
  const { data, error } = await builder;
  if (error) {
    console.error("[admin-data] products", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

export async function listStoreProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(id, is_active, stock, deleted_at)")
    .eq("product_type", "sparepart")
    .eq("is_store_visible", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] store products", error);
    return [];
  }
  type StoreVariantInfo = { id: string; is_active: boolean; stock: number; deleted_at: string | null };
  type StoreProductWithVariants = ProductRow & { product_variants?: StoreVariantInfo[] | null };

  return ((data ?? []) as unknown as StoreProductWithVariants[]).map((p) => {
    const activeVariants = Array.isArray(p.product_variants)
      ? p.product_variants.filter((v) => v.is_active && !v.deleted_at)
      : [];
    return {
      ...p,
      has_active_variants: activeVariants.length > 0,
    };
  });
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !data) return null;
  return data as ProductRow;
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductRow;
}

export async function getRelatedProducts(
  product: ProductRow,
  limit = 4
): Promise<ProductRow[]> {
  const supabase = await getSupabase();

  // Priority 1: explicit related_ids
  if (product.related_ids && product.related_ids.length > 0) {
    const ids = product.related_ids.filter((id) => id !== product.id).slice(0, limit);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("product_type", "sparepart")
        .eq("is_store_visible", true)
        .is("deleted_at", null);
      if (data && data.length > 0) return data as ProductRow[];
    }
  }

  // Priority 2: same brand (exclude self)
  const { data: byBrand } = await supabase
    .from("products")
    .select("*")
    .eq("brand", product.brand)
    .neq("id", product.id)
    .eq("product_type", "sparepart")
    .eq("is_store_visible", true)
    .is("deleted_at", null)
    .limit(limit);

  const brandResults = (byBrand ?? []) as ProductRow[];
  if (brandResults.length >= limit) return brandResults.slice(0, limit);

  // Priority 3: supplement with same category
  const { data: byCategory } = await supabase
    .from("products")
    .select("*")
    .eq("category", product.category)
    .neq("id", product.id)
    .eq("product_type", "sparepart")
    .eq("is_store_visible", true)
    .is("deleted_at", null)
    .limit(limit - brandResults.length);

  const categoryResults = (byCategory ?? []) as ProductRow[];
  const seen = new Set([...brandResults.map((p) => p.id), ...categoryResults.map((p) => p.id)]);
  const combined = [
    ...brandResults,
    ...categoryResults.filter((p) => !seen.has(p.id)),
  ];

  return combined.slice(0, limit);
}

export async function listSparepartCategories(): Promise<string[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("product_categories").select("name").order("name");
  if (error || !data) return [];
  return (data as { name: string }[]).map((r) => r.name);
}

export interface CareerRow {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  type_badge_color: string;
  summary: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  status: string;
  sort_order: number;
  created_at: string;
  deleted_at?: string | null;
}

export async function listCareers(): Promise<CareerRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("careers")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] careers", error);
    return [];
  }
  return (data ?? []) as CareerRow[];
}

export async function getCareer(id: string): Promise<CareerRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("careers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as CareerRow;
}

export interface BrandRow {
  id: string;
  name: string;
  segment: string | null;
  segment_color: string | null;
  tagline: string | null;
  description: string | null;
  accent_color: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export async function listBrands(): Promise<BrandRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] brands", error);
    return [];
  }
  return (data ?? []) as BrandRow[];
}

export async function getProductVariants(productId: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("product_variants")
    .select("id, label, sku, price_override, stock, variant_group")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .order("sort_order");
  return data ?? [];
}

export async function getBrand(id: string): Promise<BrandRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as BrandRow;
}

export interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  role_color: string | null;
  bio: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export async function listTeamMembers(): Promise<TeamMemberRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] team_members", error);
    return [];
  }
  return (data ?? []) as TeamMemberRow[];
}

export async function getTeamMember(id: string): Promise<TeamMemberRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as TeamMemberRow;
}

export interface GroupCompanyRow {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export async function listGroupCompanies(): Promise<GroupCompanyRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("group_companies")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] group_companies", error);
    return [];
  }
  return (data ?? []) as GroupCompanyRow[];
}

export async function getGroupCompany(id: string): Promise<GroupCompanyRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("group_companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as GroupCompanyRow;
}

export interface PartnerRow {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export async function listPartners(): Promise<PartnerRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] partners", error);
    return [];
  }
  return (data ?? []) as PartnerRow[];
}

export async function getPartner(id: string): Promise<PartnerRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as PartnerRow;
}

export async function listEligibleHeroProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "b2b_system")
    .eq("is_active", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] eligible hero products", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

export interface DistributionEntityRow {
  id: string;
  name: string;
  legal_name: string | null;
  short_name: string | null;
  distribution_type: "group_distribution" | "distributor" | "sub_distributor";
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
  is_active: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listDistributionEntities(): Promise<DistributionEntityRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("distribution_entities")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("[admin-data] distribution_entities", error);
    return [];
  }
  return (data ?? []) as DistributionEntityRow[];
}

export async function getStoreSettings(): Promise<Record<string, unknown>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "store")
    .maybeSingle();
  if (error || !data) {
    return {
      currency: "IDR",
      enableShipping: false,
      couriers: [],
    };
  }
  return (data as { value: Record<string, unknown> }).value;
}

export interface ShippingZoneRow {
  id: string;
  name: string;
  provinces: string[];
  cities: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingZoneRegionRow {
  id: string;
  zone_id: string;
  province: string;
  city: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShippingRateRow {
  id: string;
  zone_id: string;
  weight_from_g: number;
  weight_to_g: number;
  cost: number;
  is_active?: boolean;
}

export interface ShippingZoneWithDetails extends ShippingZoneRow {
  rates: ShippingRateRow[];
  regions: ShippingZoneRegionRow[];
}

export type ShippingZoneWithRates = ShippingZoneWithDetails;

export interface ShippingAdminData {
  shippingCoreReady: boolean;
  testRateRpcReady: boolean;
  zones: ShippingZoneWithDetails[];
  unweightedProductsCount: number;
}

export async function countUnweightedStoreProducts(): Promise<number> {
  const supabase = await getSupabase();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("product_type", "sparepart")
    .eq("is_store_visible", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .or("weight_grams.is.null,weight_grams.lte.0");
  if (error || count == null) return 0;
  return count;
}

export async function getShippingAdminData(): Promise<ShippingAdminData> {
  const supabase = await getSupabase();
  const unweightedProductsCount = await countUnweightedStoreProducts();

  // 1. Probe shipping core readiness (shipping_zone_regions table)
  let shippingCoreReady = true;
  const { error: probeError } = await supabase
    .from("shipping_zone_regions")
    .select("id")
    .limit(1);

  if (probeError) {
    if (probeError.code === "42P01" || probeError.code === "PGRST205") {
      shippingCoreReady = false;
    } else {
      console.error("[shipping] unexpected shipping_zone_regions probe error", probeError);
    }
  }

  // 2. Probe staff test RPC readiness (test_shipping_rate function)
  let testRateRpcReady = false;
  const { error: testRateError } = await supabase.rpc("test_shipping_rate", {
    p_province: "__readiness_probe__",
    p_city: "__readiness_probe__",
    p_total_weight_g: 1,
  });

  if (!testRateError || testRateError.code === "42501") {
    testRateRpcReady = true;
  } else if (
    testRateError.code === "PGRST202" ||
    (testRateError.code === "42883" &&
      typeof testRateError.message === "string" &&
      testRateError.message.includes("test_shipping_rate"))
  ) {
    testRateRpcReady = false;
  } else {
    // The RPC exists and was invoked by PostgREST, but an internal query or business logic errored
    console.error("[shipping] test_shipping_rate probe returned internal error:", testRateError);
    testRateRpcReady = true;
  }



  const { data: zones, error: zonesError } = await supabase
    .from("shipping_zones")
    .select("id, name, provinces, cities, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (zonesError || !zones) {
    return { shippingCoreReady, testRateRpcReady, zones: [], unweightedProductsCount };
  }

  const zoneIds = (zones as ShippingZoneRow[]).map((z) => z.id);
  if (zoneIds.length === 0) {
    return { shippingCoreReady, testRateRpcReady, zones: [], unweightedProductsCount };
  }

  // Load rates
  let ratesData: ShippingRateRow[] = [];
  if (shippingCoreReady) {
    const { data: rates } = await supabase
      .from("shipping_rates")
      .select("id, zone_id, weight_from_g, weight_to_g, cost, is_active")
      .in("zone_id", zoneIds)
      .order("weight_from_g", { ascending: true });
    ratesData = (rates ?? []) as ShippingRateRow[];
  } else {
    // Pre-0045 fallback: shipping_rates might not have is_active column yet
    const { data: rates } = await supabase
      .from("shipping_rates")
      .select("id, zone_id, weight_from_g, weight_to_g, cost")
      .in("zone_id", zoneIds)
      .order("weight_from_g", { ascending: true });
    ratesData = ((rates ?? []) as ShippingRateRow[]).map((r) => ({ ...r, is_active: true }));
  }

  // Load regions (if core schema is ready)
  let regionsData: ShippingZoneRegionRow[] = [];
  if (shippingCoreReady) {
    const { data: regions } = await supabase
      .from("shipping_zone_regions")
      .select("id, zone_id, province, city, is_active, created_at, updated_at")
      .in("zone_id", zoneIds)
      .order("province", { ascending: true })
      .order("city", { ascending: true, nullsFirst: true });
    regionsData = (regions ?? []) as ShippingZoneRegionRow[];
  }

  const rateMap = new Map<string, ShippingRateRow[]>();
  for (const r of ratesData) {
    const list = rateMap.get(r.zone_id) ?? [];
    list.push(r);
    rateMap.set(r.zone_id, list);
  }

  const regionMap = new Map<string, ShippingZoneRegionRow[]>();
  for (const reg of regionsData) {
    const list = regionMap.get(reg.zone_id) ?? [];
    list.push(reg);
    regionMap.set(reg.zone_id, list);
  }

  const combinedZones: ShippingZoneWithDetails[] = (zones as ShippingZoneRow[]).map((z) => ({
    ...z,
    rates: rateMap.get(z.id) ?? [],
    regions: regionMap.get(z.id) ?? [],
  }));

  return {
    shippingCoreReady,
    testRateRpcReady,
    zones: combinedZones,
    unweightedProductsCount,
  };
}

export async function getShippingZones(): Promise<ShippingZoneWithDetails[]> {
  const data = await getShippingAdminData();
  return data.zones;
}

export async function getAdminBankAccount(): Promise<BankAccount | null> {
  const admin = await getAdminUser();
  if (!admin) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_account")
    .maybeSingle();
  if (error || !data) return null;
  return parseBankAccount((data as { value: unknown }).value);
}
