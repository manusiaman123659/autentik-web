import type { NextRequest } from "next/server";
import { getPublicCareerListings } from "@/lib/public-data";
import type { MikaJobQueryParams } from "@/types/mika-career";

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalFilter(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized !== "all" ? normalized.slice(0, 100) : undefined;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: MikaJobQueryParams = {
    page: positiveInteger(searchParams.get("page"), 1),
    per_page: Math.min(positiveInteger(searchParams.get("per_page"), 10), 50),
    search: optionalFilter(searchParams.get("search")),
    department_id: optionalFilter(searchParams.get("department_id")),
    company_id: optionalFilter(searchParams.get("company_id")),
    employment_type: optionalFilter(searchParams.get("employment_type")),
  };

  try {
    const listings = await getPublicCareerListings(params);
    return Response.json(
      {
        ...listings.response,
        source: listings.source,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[Careers API] Gagal memuat lowongan:", error);
    return Response.json(
      {
        success: false,
        message: "Lowongan belum dapat diperbarui. Silakan coba kembali.",
      },
      { status: 500 },
    );
  }
}
