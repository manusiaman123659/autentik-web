import { revalidatePath } from "next/cache";

export function getB2BRevalidationPaths(slugs: readonly (string | null | undefined)[]): string[] {
  const unique = [...new Set(slugs.filter((slug): slug is string => typeof slug === "string" && /^[a-z0-9-]+$/.test(slug) && slug.length <= 200))];
  return ["id", "en", "zh-CN"].flatMap(locale => [`/${locale}`, `/${locale}/products`, ...unique.map(slug => `/${locale}/products/${slug}`)]);
}
export function revalidateB2BProduct(slugs: readonly (string | null | undefined)[]): void {
  for (const destination of getB2BRevalidationPaths(slugs)) revalidatePath(destination);
}
