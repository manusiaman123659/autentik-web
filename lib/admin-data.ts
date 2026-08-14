import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { OrderStatus } from "@/lib/validations/storeSchema";
import type { ComproSettings } from "@/lib/validations/comproSchema";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  product_type: "b2b_system" | "sparepart";
  sku?: string | null;
  brand: string;
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
    supabase.from("orders").select("id", { count: "exact" }).in("status", ["pending", "paid"]),
    supabase
      .from("orders")
      .select("total")
      .in("status", ["paid", "shipped", "completed"])
      .gte("created_at", iso),
    supabase.from("contact_messages").select("id", { count: "exact" }).eq("is_read", false),
    supabase
      .from("products")
      .select("id, stock, low_stock_threshold")
      .eq("product_type", "sparepart"),
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

export async function listOrders(status?: string): Promise<OrderRow[]> {
  const supabase = await getSupabase();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) {
    console.error("[admin-data] orders", error);
    return [];
  }
  return (data ?? []) as OrderRow[];
}

export async function getOrder(id: string) {
  const supabase = await getSupabase();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
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
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin-data] store products", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as ProductRow;
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
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