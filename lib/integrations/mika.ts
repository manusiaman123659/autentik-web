import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCanonicalOrigin } from "@/lib/auth-redirect";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { encodeMikaCursor, type MikaPagination } from "@/lib/validations/mikaIntegrationSchema";
import { createAdminClient } from "@/utils/supabase/admin";

const APPROVED_BRAND_IDS = ["talpha", "autentik", "cylab", "ullun", "epal"] as const;
const APPROVED_BRANDS = new Set<string>(APPROVED_BRAND_IDS);
const BRAND_NAMES: Record<(typeof APPROVED_BRAND_IDS)[number], string> = {
  talpha: "Talpha",
  autentik: "Autentik",
  cylab: "Cylab",
  ullun: "Ullun",
  epal: "Epal",
};

const PRODUCT_SELECT = `
  id,
  slug,
  name,
  brand_id,
  brand,
  category,
  description,
  features,
  specs,
  image_url,
  gallery,
  brochure_url,
  model_3d_url,
  status,
  is_active,
  deleted_at,
  technical_documents(
    id,
    title,
    file_type,
    file_url,
    file_size_kb,
    requires_lead
  )
`;
const PRODUCT_SCAN_SIZE = 200;
const AUTH_WINDOW_MS = 5 * 60_000;
const VALID_AUTH_LIMIT = 120;
const INVALID_AUTH_LIMIT = 20;
const RETRY_AFTER_SECONDS = "300";

type MikaErrorCode =
  | "INVALID_CURSOR"
  | "INVALID_QUERY"
  | "UNAUTHORIZED"
  | "PRODUCT_NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

type ProductDocumentRow = {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  file_size_kb: number | null;
  requires_lead: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  brand: string;
  category: string;
  description: string;
  features: unknown;
  specs: unknown;
  image_url: string | null;
  gallery: unknown;
  brochure_url: string | null;
  model_3d_url: string | null;
  status: string;
  is_active: boolean;
  deleted_at: string | null;
  technical_documents: ProductDocumentRow[] | null;
};

type BrandRow = {
  id: string;
  name: string;
  segment: string | null;
  tagline: string | null;
  description: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  is_active: boolean;
};

export type MikaProductDto =
  | {
      aka_product_id: string;
      sync_status: "inactive";
      deleted_at: string | null;
    }
  | {
      aka_product_id: string;
      sync_status: "active";
      slug: string;
      name: string;
      brand: { aka_brand_id: string; name: string };
      technical_category: string;
      description: string;
      features: string[];
      specifications: { label: string; value: string }[];
      images: { role: "primary" | "gallery"; url: string; position: number }[];
      assets: {
        brochure_url: string | null;
        model_3d: { format: "glb"; url: string } | null;
        documents: {
          aka_document_id: string;
          type: string;
          title: string;
          url: string;
          file_size_kb: number | null;
        }[];
      };
    };

export type MikaBrandDto = {
  aka_brand_id: string;
  sync_status: "active" | "inactive";
  name: string;
  segment: string | null;
  tagline: string | null;
  description: string | null;
  logos: { light: string | null; dark: string | null };
};

export class MikaIntegrationError extends Error {
  constructor(public readonly category: string) {
    super(category);
    this.name = "MikaIntegrationError";
  }
}

const SECURITY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization",
};

export function mikaJsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { ...SECURITY_HEADERS, ...headers },
  });
}

export function mikaErrorResponse(code: MikaErrorCode, message: string, status: number) {
  const headers: HeadersInit = {};
  if (status === 401) headers["WWW-Authenticate"] = "Bearer";
  if (status === 429) headers["Retry-After"] = RETRY_AFTER_SECONDS;
  return mikaJsonResponse({ error: { code, message } }, status, headers);
}

function invalidAuthResponse(request: NextRequest, endpoint: string) {
  const clientKey = getInvalidAuthClientKey(request);
  const rateLimit = checkRateLimit(`mika:invalid-auth:${clientKey}`, INVALID_AUTH_LIMIT, AUTH_WINDOW_MS);
  if (!rateLimit.allowed) {
    logMikaRequest(endpoint, "rate_limited", 429, 0, 0);
    return mikaErrorResponse("RATE_LIMITED", "Terlalu banyak permintaan.", 429);
  }
  logMikaRequest(endpoint, "unauthorized", 401, 0, 0);
  return mikaErrorResponse("UNAUTHORIZED", "Kredensial integrasi tidak valid.", 401);
}

function getInvalidAuthClientKey(request: NextRequest): string {
  // Only trust the forwarded address when the process is known to run behind
  // Vercel's managed proxy. Otherwise use one shared best-effort bucket.
  if (process.env.VERCEL === "1") {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded && /^[0-9a-fA-F:.]+$/.test(forwarded)) return forwarded;
  }
  return "shared";
}

export function authorizeMikaRequest(request: NextRequest, endpoint: string): NextResponse | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer[ \t]+([^\s,]+)$/i);
  const expectedSecret = process.env.MIKA_INTEGRATION_SECRET?.trim();

  if (!expectedSecret) {
    logError("integration.mika.configuration", "Konfigurasi integrasi tidak tersedia.", {
      endpoint,
      category: "missing_server_secret",
    });
    return invalidAuthResponse(request, endpoint);
  }

  if (!match) return invalidAuthResponse(request, endpoint);

  const actualDigest = createHash("sha256").update(match[1], "utf8").digest();
  const expectedDigest = createHash("sha256").update(expectedSecret, "utf8").digest();
  if (!timingSafeEqual(actualDigest, expectedDigest)) {
    return invalidAuthResponse(request, endpoint);
  }

  const rateLimit = checkRateLimit("mika:valid-auth", VALID_AUTH_LIMIT, AUTH_WINDOW_MS);
  if (!rateLimit.allowed) {
    logMikaRequest(endpoint, "rate_limited", 429, 0, 0);
    return mikaErrorResponse("RATE_LIMITED", "Terlalu banyak permintaan.", 429);
  }

  return null;
}

export function logMikaRequest(
  endpoint: string,
  outcome: string,
  statusCode: number,
  rowCount: number,
  durationMs: number,
) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ctx: "integration.mika.request",
    endpoint,
    outcome,
    statusCode,
    rowCount,
    durationMs,
  }));
}

export function logMikaFailure(endpoint: string, category: string, durationMs: number) {
  logError("integration.mika.request", "Permintaan integrasi gagal.", {
    endpoint,
    category,
    statusCode: 500,
    durationMs,
  });
}

export function resolveMikaAssetOrigin(requestUrl: string, endpoint: string): string | null {
  if (process.env.NODE_ENV === "production") {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    try {
      if (!configured) throw new Error("missing");
      const parsed = new URL(configured);
      if (parsed.protocol !== "https:") throw new Error("invalid_protocol");
      return parsed.origin;
    } catch {
      logError("integration.mika.configuration", "Origin aset integrasi tidak tersedia.", {
        endpoint,
        category: "invalid_canonical_origin",
      });
      return null;
    }
  }

  const origin = getCanonicalOrigin(requestUrl);
  try {
    const parsed = new URL(origin);
    return parsed.origin;
  } catch {
    logError("integration.mika.configuration", "Origin aset integrasi tidak tersedia.", {
      endpoint,
      category: "invalid_canonical_origin",
    });
    return null;
  }
}

function normalizeAssetUrl(value: unknown, canonicalOrigin: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("\\")) return null;

  try {
    let parsed: URL;
    if (trimmed.startsWith("/")) {
      if (!canonicalOrigin) return null;
      parsed = new URL(trimmed, canonicalOrigin);
    } else {
      parsed = new URL(trimmed);
    }

    if (parsed.username || parsed.password) return null;
    if (parsed.protocol === "https:") return parsed.toString();

    const isLocalHost = parsed.hostname === "localhost"
      || parsed.hostname === "127.0.0.1"
      || parsed.hostname === "::1";
    if (parsed.protocol === "http:" && process.env.NODE_ENV !== "production" && isLocalHost) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeBrand(value: string): string {
  return value.trim().toLowerCase();
}

function getEligibleBrandId(product: ProductRow): string | null {
  if (product.brand_id !== null) {
    return APPROVED_BRANDS.has(product.brand_id) ? product.brand_id : null;
  }
  const legacyBrand = normalizeBrand(product.brand);
  return APPROVED_BRANDS.has(legacyBrand) ? legacyBrand : null;
}

function normalizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const normalized = item.trim();
    return normalized ? [normalized] : [];
  });
}

function normalizeSpecifications(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
    const specificationValue = "value" in item && typeof item.value === "string" ? item.value.trim() : "";
    return label || specificationValue ? [{ label, value: specificationValue }] : [];
  });
}

function normalizeImages(product: ProductRow, canonicalOrigin: string | null) {
  const images: { role: "primary" | "gallery"; url: string; position: number }[] = [];
  const seen = new Set<string>();
  const primary = normalizeAssetUrl(product.image_url, canonicalOrigin);
  if (primary) {
    images.push({ role: "primary", url: primary, position: 0 });
    seen.add(primary);
  }

  if (Array.isArray(product.gallery)) {
    product.gallery.forEach((item, index) => {
      const url = normalizeAssetUrl(item, canonicalOrigin);
      if (!url || seen.has(url)) return;
      images.push({ role: "gallery", url, position: index + 1 });
      seen.add(url);
    });
  }
  return images;
}

function serializeProduct(
  product: ProductRow,
  brandNames: Map<string, string>,
  canonicalOrigin: string | null,
): MikaProductDto | null {
  const brandId = getEligibleBrandId(product);
  if (!brandId) return null;

  const isActive = product.status === "published"
    && product.is_active === true
    && product.deleted_at === null;
  if (!isActive) {
    return {
      aka_product_id: product.id,
      sync_status: "inactive",
      deleted_at: product.deleted_at,
    };
  }

  const documents = (Array.isArray(product.technical_documents) ? product.technical_documents : [])
    .filter((document) => document.requires_lead === false)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((document) => {
      const url = normalizeAssetUrl(document.file_url, canonicalOrigin);
      if (!url) return [];
      return [{
        aka_document_id: document.id,
        type: document.file_type,
        title: document.title,
        url,
        file_size_kb: Number.isFinite(document.file_size_kb) ? document.file_size_kb : null,
      }];
    });

  const modelUrl = normalizeAssetUrl(product.model_3d_url, canonicalOrigin);
  return {
    aka_product_id: product.id,
    sync_status: "active",
    slug: product.slug,
    name: product.name,
    brand: {
      aka_brand_id: brandId,
      name: brandNames.get(brandId)
        ?? BRAND_NAMES[brandId as keyof typeof BRAND_NAMES]
        ?? product.brand.trim(),
    },
    technical_category: product.category,
    description: product.description,
    features: normalizeFeatures(product.features),
    specifications: normalizeSpecifications(product.specs),
    images: normalizeImages(product, canonicalOrigin),
    assets: {
      brochure_url: normalizeAssetUrl(product.brochure_url, canonicalOrigin),
      model_3d: modelUrl ? { format: "glb", url: modelUrl } : null,
      documents,
    },
  };
}

async function loadApprovedBrandNames(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .in("id", [...APPROVED_BRAND_IDS]);
  if (error) throw new MikaIntegrationError("brand_lookup_failed");

  return new Map((data ?? []).map((brand) => [brand.id, brand.name]));
}

function productCandidateQuery() {
  const supabase = createAdminClient();
  return supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("product_type", "b2b_system")
    .or(`brand_id.in.(${APPROVED_BRAND_IDS.join(",")}),brand_id.is.null`)
    // Embedded filtering without !inner keeps products that have zero documents.
    .eq("technical_documents.requires_lead", false);
}

export async function listMikaProducts(
  pagination: MikaPagination,
  canonicalOrigin: string | null,
) {
  const brandNames = await loadApprovedBrandNames();
  const collected: MikaProductDto[] = [];
  let scanAfter = pagination.lastId;

  while (collected.length < pagination.limit + 1) {
    let query = productCandidateQuery()
      .order("id", { ascending: true })
      .limit(PRODUCT_SCAN_SIZE);
    if (scanAfter !== null) query = query.gt("id", scanAfter);

    const { data, error } = await query;
    if (error) throw new MikaIntegrationError("product_list_query_failed");

    const rows = (data ?? []) as unknown as ProductRow[];
    if (rows.length === 0) break;

    const lastScannedId = rows[rows.length - 1]?.id;
    if (!lastScannedId || lastScannedId === scanAfter) {
      throw new MikaIntegrationError("product_scan_did_not_advance");
    }
    scanAfter = lastScannedId;

    for (const row of rows) {
      const product = serializeProduct(row, brandNames, canonicalOrigin);
      if (product) collected.push(product);
      if (collected.length >= pagination.limit + 1) break;
    }

    if (rows.length < PRODUCT_SCAN_SIZE) break;
  }

  const hasMore = collected.length > pagination.limit;
  const data = collected.slice(0, pagination.limit);
  return {
    data,
    meta: {
      api_version: "v1" as const,
      sync_mode: "full_snapshot" as const,
      limit: pagination.limit,
      next_cursor: hasMore && data.length > 0
        ? encodeMikaCursor(data[data.length - 1].aka_product_id, "products")
        : null,
      has_more: hasMore,
      generated_at: new Date().toISOString(),
    },
  };
}

export async function getMikaProduct(id: string, canonicalOrigin: string | null) {
  const brandNames = await loadApprovedBrandNames();
  const { data, error } = await productCandidateQuery()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new MikaIntegrationError("product_detail_query_failed");
  if (!data) return null;
  return serializeProduct(data as unknown as ProductRow, brandNames, canonicalOrigin);
}

function serializeBrand(brand: BrandRow, canonicalOrigin: string | null): MikaBrandDto {
  return {
    aka_brand_id: brand.id,
    sync_status: brand.is_active ? "active" : "inactive",
    name: brand.name,
    segment: brand.segment,
    tagline: brand.tagline,
    description: brand.description,
    logos: {
      light: normalizeAssetUrl(brand.logo_light, canonicalOrigin),
      dark: normalizeAssetUrl(brand.logo_dark, canonicalOrigin),
    },
  };
}

export async function listMikaBrands(
  pagination: MikaPagination,
  canonicalOrigin: string | null,
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("brands")
    .select("id, name, segment, tagline, description, logo_light, logo_dark, is_active")
    .in("id", [...APPROVED_BRAND_IDS])
    .order("id", { ascending: true })
    .limit(pagination.limit + 1);
  if (pagination.lastId !== null) query = query.gt("id", pagination.lastId);

  const { data: rows, error } = await query;
  if (error) throw new MikaIntegrationError("brand_list_query_failed");

  const brands = ((rows ?? []) as BrandRow[]).map((brand) => serializeBrand(brand, canonicalOrigin));
  const hasMore = brands.length > pagination.limit;
  const data = brands.slice(0, pagination.limit);
  return {
    data,
    meta: {
      api_version: "v1" as const,
      sync_mode: "full_snapshot" as const,
      limit: pagination.limit,
      next_cursor: hasMore && data.length > 0
        ? encodeMikaCursor(data[data.length - 1].aka_brand_id, "brands")
        : null,
      has_more: hasMore,
      generated_at: new Date().toISOString(),
    },
  };
}
