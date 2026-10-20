import { NextRequest, NextResponse } from "next/server";
import { isPublicLocale } from "@/i18n/locales";
import { isStoreSearchEnabled, searchStoreProducts } from "@/lib/public-store-search";
import type { StoreSearchInput } from "@/lib/public-store-search";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: NextRequest) {
  if (!isStoreSearchEnabled()) {
    return NextResponse.json({ success: false, message: "Pencarian terjemahan belum diaktifkan." }, { status: 404, headers });
  }
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale");
  const query = params.get("q") ?? "";
  const mode = params.get("mode") ?? "listing";
  const stock = params.get("stock") ?? "all";
  const pageText = params.get("page") ?? "1";
  const priceMin = params.get("min");
  const priceMax = params.get("max");
  const brands = params.getAll("brand");
  const categories = params.getAll("category");
  if (!isPublicLocale(locale) || !["listing", "suggest"].includes(mode)
    || !["all", "available", "low", "out"].includes(stock)
    || !/^\d+$/.test(pageText) || Number(pageText) < 1 || Number(pageText) > 2147483647
    || (mode === "suggest" && pageText !== "1") || [...query].length > 120
    || brands.length > 20 || categories.length > 20 || [...brands, ...categories].some(value => !value)
    || [priceMin, priceMax].some(value => value !== null && (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0))) {
    return NextResponse.json({ success: false, message: "Parameter pencarian tidak valid." }, { status: 400, headers });
  }
  const input: StoreSearchInput = {
    locale, query, mode: mode as StoreSearchInput["mode"], stock: stock as StoreSearchInput["stock"],
    brands, categories, priceMin: priceMin === null ? null : Number(priceMin),
    priceMax: priceMax === null ? null : Number(priceMax), page: Number(pageText),
  };
  try {
    return NextResponse.json({ success: true, data: await searchStoreProducts(input) }, { headers });
  } catch {
    return NextResponse.json({ success: false, message: "Pencarian Komponen belum tersedia." }, { status: 503, headers });
  }
}
