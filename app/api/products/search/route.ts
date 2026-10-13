import { NextRequest, NextResponse } from "next/server";
import { isPublicLocale } from "@/i18n/locales";
import { getPublicB2BSearchProducts } from "@/lib/public-b2b-products";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "id";
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!isPublicLocale(locale)) return NextResponse.json({ success: false, message: "Bahasa tidak valid.", data: [] }, { status: 400, headers });
  try { return NextResponse.json({ success: true, data: await getPublicB2BSearchProducts(locale) }, { headers }); }
  catch { return NextResponse.json({ success: false, message: "Pencarian produk belum tersedia.", data: [] }, { status: 503, headers }); }
}
