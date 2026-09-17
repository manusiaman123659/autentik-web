import { z } from "zod";

const heroSlideSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  badge: z.string().default("Produk Unggulan"),
  titlePart1Override: z.string().nullable().default(null),
  titleHighlightOverride: z.string().nullable().default(null),
  titlePart2Override: z.string().nullable().default(null),
  subtitleOverride: z.string().nullable().default(null),
  ctaLabel: z.string().default("Lihat Produk"),
});

export const heroSlidesSchema = z.object({
  slides: z.array(heroSlideSchema).max(3, "Maksimal 3 slide"),
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;
export type HeroSlidesData = z.infer<typeof heroSlidesSchema>;
