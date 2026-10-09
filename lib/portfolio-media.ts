export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PORTFOLIO_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const LEGACY_IMAGES = new Set(["/images/compro/slide-10.jpg", "/images/compro/slide-11.jpg"]);
const PATH = /^portfolio\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9._-]*\.(?:jpg|jpeg|png|webp)$/;

export function validatePortfolioImageFile(file: { type: string; size: number }): string | null {
  if (!(PORTFOLIO_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Gunakan gambar JPEG, PNG, atau WebP.";
  if (file.size <= 0 || file.size > PORTFOLIO_IMAGE_MAX_BYTES) return "Ukuran gambar harus lebih dari 0 dan maksimal 5 MB.";
  return null;
}

export function portfolioImagePath(value: string, projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  try {
    if (!projectUrl || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return null;
    const project = new URL(projectUrl);
    const url = new URL(value);
    const prefix = "/storage/v1/object/public/media/";
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || url.origin !== project.origin || !url.pathname.startsWith(prefix)) return null;
    const encoded = url.pathname.slice(prefix.length);
    if (/%(?:2f|5c|00)/i.test(encoded)) return null;
    const path = decodeURIComponent(encoded);
    return PATH.test(path) ? path : null;
  } catch { return null; }
}

export function isLegacyPortfolioImage(value: string): boolean { return LEGACY_IMAGES.has(value); }
export function safePortfolioImageUrl(value: unknown, projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (typeof value !== "string") return null;
  return isLegacyPortfolioImage(value) || portfolioImagePath(value, projectUrl) ? value : null;
}
