import { type NextRequest, NextResponse } from "next/server";
import { getMikaJobDetail } from "@/lib/api/mika-career";
import { localizeHref, type PublicLocale } from "@/i18n/locales";

/** Narrow pre-stream routing guard, approved for Careers detail GET/HEAD only. */
export async function getCareerRoutingResponse(request: NextRequest): Promise<NextResponse | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  // Career IDs must reach the guard even when their suffix looks like an asset.
  const match = /^\/(?:(en|zh-cn|id)\/)?careers\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (!match) return null;
  const locale: PublicLocale = match[1] === "en" ? "en" : match[1] === "zh-cn" ? "zh-CN" : "id";
  let id: string;
  try { id = decodeURIComponent(match[2]); }
  catch { id = ""; }
  const result = await getMikaJobDetail(id);
  // Unavailable goes to the existing safe unavailable page. A known foreign,
  // closed, malformed-ownership or missing job cannot begin an HTML stream.
  if (result.status !== "not_found") return null;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Lowongan Tidak Ditemukan | PT Autentik Karya Analitika</title></head><body style="margin:0;font-family:system-ui,sans-serif;color:#0B1F3A;background:#f8fafc"><main style="max-width:640px;margin:12vh auto;padding:24px"><p style="color:#0EA5A0;font-weight:700">404</p><h1>Lowongan tidak ditemukan</h1><p>Lowongan ini tidak tersedia di PT Autentik Karya Analitika.</p><a href="${localizeHref("/careers", locale)}" style="color:#0EA5A0">Kembali ke Daftar Lowongan</a></main></body></html>`;
  return new NextResponse(request.method === "HEAD" ? null : html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
