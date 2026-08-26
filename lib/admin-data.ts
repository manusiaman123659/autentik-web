import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { OrderStatus } from "@/lib/validations/storeSchema";
import { ORDER_DEFAULT_PAGE_SIZE } from "@/lib/validations/storeSchema";
import type { ComproSettings } from "@/lib/validations/comproSchema";

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
  deleted_at?: string | null;
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
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id?: string | null;
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
}

export interface TechDocRow {
  id: string;
  product_id: string;
  title: string;
  file_type: string;
  file_url: string;
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

async function getSupabase() {
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
    supabase.from("orders").select("id", { count: "exact" }).in("status", ["pending", "paid"]).is("deleted_at", null),
    supabase
      .from("orders")
      .select("total")
      .in("status", ["paid", "shipped", "completed"])
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

export interface ListOrdersParams {
  status?: OrderStatus | "all";
  page?: number; // 1-based
  pageSize?: number; // default ORDER_DEFAULT_PAGE_SIZE
}

export async function listOrders(params: ListOrdersParams = {}): Promise<{ orders: OrderRow[]; total: number }> {
  const supabase = await getSupabase();
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const pageSize = params.pageSize ?? ORDER_DEFAULT_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (status) query = query.eq("status", status);

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

export async function listStaff(): Promise<StaffRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin-data] staff", error);
    return [];
  }
  return (data ?? []) as StaffRow[];
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
  query?: string
): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  let builder = supabase
    .from("products")
    .select("*")
    .eq("product_type", productType)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
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
    .select("*")
    .eq("product_type", "sparepart")
    .eq("is_store_visible", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] store products", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
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
      midtrans: { enabled: false, sandbox: true, clientKey: "" },
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

export interface ShippingRateRow {
  id: string;
  zone_id: string;
  weight_from_g: number;
  weight_to_g: number;
  cost: number;
}

export interface ShippingZoneWithRates extends ShippingZoneRow {
  rates: ShippingRateRow[];
}

export async function getShippingZones(): Promise<ShippingZoneWithRates[]> {
  const supabase = await getSupabase();
  const { data: zones, error } = await supabase
    .from("shipping_zones")
    .select("id, name, provinces, cities, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !zones) return [];

  const zoneIds = (zones as ShippingZoneRow[]).map((z) => z.id);
  if (zoneIds.length === 0) return [];

  const { data: rates } = await supabase
    .from("shipping_rates")
    .select("id, zone_id, weight_from_g, weight_to_g, cost")
    .in("zone_id", zoneIds)
    .order("weight_from_g", { ascending: true });

  const rateMap = new Map<string, ShippingRateRow[]>();
  for (const r of (rates ?? []) as ShippingRateRow[]) {
    const list = rateMap.get(r.zone_id) ?? [];
    list.push(r);
    rateMap.set(r.zone_id, list);
  }

  return (zones as ShippingZoneRow[]).map((z) => ({
    ...z,
    rates: rateMap.get(z.id) ?? [],
  }));
}