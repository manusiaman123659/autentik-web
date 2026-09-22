import type { NextRequest } from "next/server";
import {
  authorizeMikaRequest,
  getMikaProduct,
  logMikaFailure,
  logMikaRequest,
  MikaIntegrationError,
  mikaErrorResponse,
  mikaJsonResponse,
  resolveMikaAssetOrigin,
} from "@/lib/integrations/mika";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "products.detail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startedAt = Date.now();
  const authResponse = authorizeMikaRequest(request, ENDPOINT);
  if (authResponse) return authResponse;

  if ([...request.nextUrl.searchParams.keys()].length > 0) {
    logMikaRequest(ENDPOINT, "invalid_request", 400, 0, Date.now() - startedAt);
    return mikaErrorResponse("INVALID_QUERY", "Parameter query tidak valid.", 400);
  }

  const { id } = await params;
  if (!id || id.length > 512) {
    logMikaRequest(ENDPOINT, "not_found", 404, 0, Date.now() - startedAt);
    return mikaErrorResponse("PRODUCT_NOT_FOUND", "Produk tidak ditemukan.", 404);
  }

  try {
    const canonicalOrigin = resolveMikaAssetOrigin(request.url, ENDPOINT);
    const product = await getMikaProduct(id, canonicalOrigin);
    if (!product) {
      logMikaRequest(ENDPOINT, "not_found", 404, 0, Date.now() - startedAt);
      return mikaErrorResponse("PRODUCT_NOT_FOUND", "Produk tidak ditemukan.", 404);
    }

    logMikaRequest(ENDPOINT, "success", 200, 1, Date.now() - startedAt);
    return mikaJsonResponse({ data: product });
  } catch (error) {
    const category = error instanceof MikaIntegrationError ? error.category : "unexpected_error";
    logMikaFailure(ENDPOINT, category, Date.now() - startedAt);
    return mikaErrorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500);
  }
}
