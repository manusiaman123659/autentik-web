/**
 * Supabase Storage image optimization helpers.
 * Utilizes native Supabase Image Transformations for on-the-fly resize/quality/format.
 */

const SUPABASE_STORAGE_PATTERN = /\.supabase\.co\/storage\//;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif";
}

/**
 * Append Supabase Image Transformation query params to a storage URL.
 * Returns the original URL unchanged if not a Supabase Storage URL.
 */
export function getOptimizedStorageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string | null {
  if (!url) return null;

  // Only transform Supabase Storage URLs
  if (!SUPABASE_STORAGE_PATTERN.test(url)) return url;

  try {
    const parsed = new URL(url);
    const params = new URLSearchParams();

    if (options.width) params.set("width", String(options.width));
    if (options.height) params.set("height", String(options.height));
    if (options.quality && options.quality < 100) {
      params.set("quality", String(options.quality));
    }
    if (options.format) params.set("format", options.format);

    const qs = params.toString();
    if (!qs) return url;

    // Append transform params (Supabase uses query params for transforms)
    const separator = parsed.search ? "&" : "?";
    return `${url}${separator}${qs}`;
  } catch {
    // Invalid URL — return as-is
    return url;
  }
}

/**
 * Generate a blur placeholder data URL (tiny 10x10 teal-tinted image).
 * Used as placeholder="blur" value for next/image.
 */
export const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgcng9IjEiIGZpbGw9IiMwRUE1QTAiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==";
