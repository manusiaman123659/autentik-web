import { z } from "zod";

export const shippingZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama zona wajib diisi"),
  sortOrder: z.coerce.number().int().min(0, "Urutan tidak boleh negatif").default(0),
  isActive: z.boolean().default(true),
});

export type ShippingZoneFormData = z.input<typeof shippingZoneSchema>;

export const shippingRateSchema = z
  .object({
    id: z.string().optional(),
    zoneId: z.string().min(1, "Zona wajib dipilih"),
    weightFromG: z.coerce.number().int().min(0, "Berat awal tidak boleh negatif"),
    weightToG: z.coerce.number().int().min(0, "Berat akhir tidak boleh negatif"),
    cost: z.coerce.number().positive("Ongkir harus lebih besar dari 0"),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.weightToG < val.weightFromG) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightToG"],
        message: "Berat akhir harus sama dengan atau lebih besar dari berat awal",
      });
    }
  });

export type ShippingRateFormData = z.input<typeof shippingRateSchema>;

export const shippingRegionSchema = z
  .object({
    id: z.string().optional(),
    zoneId: z.string().min(1, "Zona wajib dipilih"),
    isProvinceWide: z.boolean().default(false),
    province: z.string().min(1, "Nama provinsi wajib diisi").transform((v) => v.trim()),
    city: z.string().nullable().optional().transform((v) => (v ? v.trim() : null)),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (!val.isProvinceWide && (!val.city || val.city.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "Nama kota wajib diisi untuk mode kota tertentu",
      });
    }
  });

export type ShippingRegionFormData = z.input<typeof shippingRegionSchema>;

export const testShippingRateSchema = z.object({
  province: z.string().min(1, "Provinsi wajib diisi").transform((v) => v.trim()),
  city: z.string().optional().default("").transform((v) => (v ? v.trim() : "")),
  weightGrams: z.coerce.number().int().positive("Berat harus lebih besar dari 0 gram"),
});

export type TestShippingRateFormData = z.input<typeof testShippingRateSchema>;
