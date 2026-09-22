import type { NextRequest } from "next/server";
import {
  authorizeMikaRequest,
  listMikaBrands,
  logMikaFailure,
  logMikaRequest,
  MikaIntegrationError,
  mikaErrorResponse,
  mikaJsonResponse,
  resolveMikaAssetOrigin,
} from "@/lib/integrations/mika";
import { parseMikaPagination } from "@/lib/validations/mikaIntegrationSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = "brands.list";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authResponse = authorizeMikaRequest(request, ENDPOINT);
  if (authResponse) return authResponse;

  const pagination = parseMikaPagination(request.nextUrl.searchParams, "brands");
  if (!pagination.success) {
    const message = pagination.code === "INVALID_CURSOR"
      ? "Cursor tidak valid."
      : "Parameter query tidak valid.";
    logMikaRequest(ENDPOINT, "invalid_request", 400, 0, Date.now() - startedAt);
    return mikaErrorResponse(pagination.code, message, 400);
  }

  try {
    const canonicalOrigin = resolveMikaAssetOrigin(request.url, ENDPOINT);
    const result = await listMikaBrands(pagination.data, canonicalOrigin);
    logMikaRequest(ENDPOINT, "success", 200, result.data.length, Date.now() - startedAt);
    return mikaJsonResponse(result);
  } catch (error) {
    const category = error instanceof MikaIntegrationError ? error.category : "unexpected_error";
    logMikaFailure(ENDPOINT, category, Date.now() - startedAt);
    return mikaErrorResponse("INTERNAL_ERROR", "Terjadi kesalahan internal.", 500);
  }
}
