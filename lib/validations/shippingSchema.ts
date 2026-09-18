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
