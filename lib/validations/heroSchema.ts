import { z } from "zod";

export const heroSlideSchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih"),
});

export const heroSlidesReadSchema = z.object({
  slides: z.array(heroSlideSchema).max(3, "Maksimal 3 slide"),
});

export const heroSlidesSchema = heroSlidesReadSchema.superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.slides.forEach((slide, index) => {
    if (seen.has(slide.productId)) {
      ctx.addIssue({
        code: "custom",
        path: ["slides", index, "productId"],
        message: "Produk tidak boleh dipilih lebih dari sekali",
      });
    }
    seen.add(slide.productId);
  });
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;
export type HeroSlidesData = z.infer<typeof heroSlidesSchema>;
