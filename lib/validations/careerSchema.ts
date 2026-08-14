import { z } from "zod";

export const careerLocations = ["Office", "Home", "Hybrid", "Field"] as const;
export const careerTypes = ["Full-time", "Magang", "Contract"] as const;
export const careerBadgeColors = ["green", "purple", "blue"] as const;

export const careerSchema = z.object({
  id: z.string().trim().optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung (-)"),
  title: z.string().trim().min(1, "Judul posisi wajib diisi"),
  department: z.string().trim().min(1, "Departemen wajib diisi"),
  location: z.enum(careerLocations, "Lokasi tidak valid"),
  type: z.enum(careerTypes, "Tipe pekerjaan tidak valid"),
  typeBadgeColor: z.enum(careerBadgeColors, "Warna badge tidak valid"),
  summary: z.string().trim().min(1, "Ringkasan wajib diisi"),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  status: z.enum(["open", "closed"]).default("open"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type CareerFormValues = z.infer<typeof careerSchema>;
