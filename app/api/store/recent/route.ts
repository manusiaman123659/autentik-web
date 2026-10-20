import { NextResponse } from "next/server";
import { isPublicLocale } from "@/i18n/locales";
import { productIdSchema } from "@/lib/validations/productSchema";
import { getPublicStoreRecentProducts } from "@/lib/public-store-products";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) {
    return NextResponse.json({ success: false, message: "Permintaan terlalu besar." }, { status: 413, headers });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 8192) {
      return NextResponse.json({ success: false, message: "Permintaan terlalu besar." }, { status: 413, headers });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan produk tidak valid." }, { status: 400, headers });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Permintaan produk tidak valid." }, { status: 400, headers });
  }
  const { ids, locale } = body as { ids?: unknown; locale?: unknown };
  if (!isPublicLocale(locale) || !Array.isArray(ids) || ids.length > 8
    || ids.some(id => !productIdSchema.safeParse(id).success)) {
    return NextResponse.json({ success: false, message: "Permintaan produk tidak valid." }, { status: 400, headers });
  }
  try {
    return NextResponse.json({ success: true, data: await getPublicStoreRecentProducts(ids, locale) }, { headers });
  } catch {
    return NextResponse.json({ success: false, message: "Produk yang baru dilihat belum dapat dimuat." }, { status: 503, headers });
  }
}
