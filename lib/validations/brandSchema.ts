import { z } from "zod";

export const brandSegments = ["HSE", "ENV", "Platform", "Lab"] as const;

export const brandSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama merek wajib diisi"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung (-)"),
  segment: z.enum(brandSegments, "Segment tidak valid"),
  segmentColor: z.string().min(1, "Warna segment wajib diisi"),
  tagline: z.string().trim().default(""),
  description: z.string().trim().default(""),
  accentColor: z.string().min(1, "Warna aksen wajib diisi"),
  logoLight: z.string().default(""),
  logoDark: z.string().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type BrandFormValues = z.infer<typeof brandSchema>;