import { z } from "zod";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Dibayar",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const orderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    trackingCourier: z.string().default(""),
    trackingNumber: z.string().default(""),
    cancelReason: z.string().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.status === "shipped" && !val.trackingNumber.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trackingNumber"],
        message: "Nomor resi wajib diisi saat status Dikirim",
      });
    }
    if (val.status === "cancelled" && !val.cancelReason.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelReason"],
        message: "Alasan pembatalan wajib diisi",
      });
    }
  });

export type OrderStatusFormData = z.infer<typeof orderStatusSchema>;

export const manualOrderSchema = z.object({
  customerName: z.string().min(2, "Nama pembeli minimal 2 karakter"),
  customerEmail: z.string().email("Format email tidak valid").or(z.literal("")).default(""),
  customerPhone: z.string().default(""),
  address: z.string().min(8, "Alamat minimal 8 karakter"),
  city: z.string().min(2, "Kota wajib diisi"),
  province: z.string().min(2, "Provinsi wajib diisi"),
  postalCode: z.string().default(""),
  notes: z.string().default(""),
  paymentMethod: z.enum(["transfer", "cod", "midtrans"]).default("transfer"),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1) }))
    .min(1, "Minimal 1 item pesanan"),
});

export type ManualOrderFormData = z.infer<typeof manualOrderSchema>;

export const checkoutOrderSchema = z.object({
  customerName: z.string().min(2, "Nama pembeli minimal 2 karakter"),
  customerEmail: z.string().email("Format email tidak valid").or(z.literal("")).default(""),
  customerPhone: z.string().default(""),
  address: z.string().min(8, "Alamat minimal 8 karakter"),
  city: z.string().min(2, "Kota wajib diisi"),
  province: z.string().min(2, "Provinsi wajib diisi"),
  postalCode: z.string().default(""),
  notes: z.string().default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "ID produk tidak valid"),
        quantity: z.coerce.number().int().min(1).max(999, "Jumlah maksimal 999"),
      })
    )
    .min(1, "Minimal 1 item pesanan"),
});

export type CheckoutOrderFormData = z.input<typeof checkoutOrderSchema>;

export const storeSettingsSchema = z.object({
  currency: z.string().min(1, "Mata uang wajib diisi"),
  enableShipping: z.boolean().default(false),
  couriers: z.array(z.string()).default([]),
  midtrans: z.object({
    enabled: z.boolean().default(false),
    sandbox: z.boolean().default(true),
    clientKey: z.string().default(""),
  }),
});

export type StoreSettingsFormData = z.infer<typeof storeSettingsSchema>;

export const stockUpdateSchema = z.object({
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
});