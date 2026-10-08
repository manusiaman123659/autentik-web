import { z } from "zod";
import { isSafeCourier, isSafeTrackingNumber } from "@/lib/shipping/tracking";

export const ORDER_STATUSES = ["pending", "processing", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Pagination daftar pesanan admin (/admin/orders) — dipakai server page & client.
export const ORDER_PAGE_SIZES = [10, 25, 50] as const;
export const ORDER_DEFAULT_PAGE_SIZE = 25;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const orderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    trackingCourier: z.string().default(""),
    trackingNumber: z.string().default(""),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    cancelReason: z.string().default(""),
  })
  .superRefine((val, ctx) => {
    if (["processing", "shipped"].includes(val.status) && !isSafeCourier(val.trackingCourier)) {
      ctx.addIssue({ code: "custom", path: ["trackingCourier"], message: "Kurir harus berupa teks biasa, maksimal 80 karakter" });
    }
    if (["processing", "shipped"].includes(val.status) && !isSafeTrackingNumber(val.trackingNumber)) {
      ctx.addIssue({ code: "custom", path: ["trackingNumber"], message: "Resi maksimal 100 karakter, hanya huruf, angka, spasi, - _ . / dan bukan URL" });
    }
    if (["processing", "shipped"].includes(val.status) && (val.trackingNumber.trim() || val.status === "shipped") && !val.trackingCourier.trim()) {
      ctx.addIssue({ code: "custom", path: ["trackingCourier"], message: "Kurir wajib dipilih jika ada resi atau status Dikirim" });
    }
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
  })
  .transform((val) => ["processing", "shipped"].includes(val.status)
    ? { ...val, trackingCourier: val.trackingCourier.trim(), trackingNumber: val.trackingNumber.trim() }
    : val);

export type OrderStatusFormData = z.infer<typeof orderStatusSchema>;

export const manualOrderRefundSchema = z
  .object({
    orderId: z.string().uuid("ID pesanan tidak valid"),
    reference: z.string().trim().max(120, "Referensi maksimal 120 karakter").default(""),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter").default(""),
  })
  .refine((value) => value.reference.length > 0 || value.note.length > 0, {
    message: "Isi referensi atau catatan pengembalian dana",
    path: ["reference"],
  });

export type ManualOrderRefundFormData = z.input<typeof manualOrderRefundSchema>;

export const checkoutOrderSchema = z.object({
  idempotencyKey: z.string().uuid("Kunci checkout tidak valid"),
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
        variantId: z.string().uuid().nullable().optional(),
      })
    )
    .min(1, "Minimal 1 item pesanan"),
});

export type CheckoutOrderFormData = z.input<typeof checkoutOrderSchema>;

// Schema untuk form checkout (client). `items` DILEPAS karena bukan field form
// yang di-register react-hook-form (di-inject manual di onSubmit dari keranjang).
// Memakainya sebagai resolver mencegah validasi senyap gagal karena `items`
// tidak pernah ada di form values (root cause: klik "Buat Pesanan" tidak
// melakukan apa pun tanpa pesan error). Server tetap memakai
// `checkoutOrderSchema` (ketat) lewat submitCheckout yang selalu menerima items.
export const checkoutFormSchema = checkoutOrderSchema.omit({ idempotencyKey: true, items: true });
export type CheckoutFormData = z.input<typeof checkoutFormSchema>;

export const courierNameSchema = z.string()
  .refine((value) => !/[\u0000-\u001f\u007f-\u009f]/.test(value), "Nama kurir tidak boleh mengandung karakter kontrol")
  .trim()
  .min(1, "Nama kurir wajib diisi")
  .max(80, "Nama kurir maksimal 80 karakter")
  .refine((value) => /[^\s\u200b-\u200d\u2060\ufeff]/.test(value), "Nama kurir wajib memiliki karakter yang terlihat")
  .refine(isSafeCourier, "Nama kurir harus berupa teks biasa, bukan HTML, script, atau URL")
  .refine((value) => !/(?:^|[\s/])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]|$)/i.test(value), "Nama kurir tidak boleh berupa URL");

export const courierListSchema = z.array(courierNameSchema).superRefine((values, ctx) => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({ code: "custom", path: [index], message: "Kurir ini sudah terdaftar. Nama kurir tidak boleh duplikat" });
    }
    seen.add(key);
  });
});

export const storeSettingsSchema = z.object({
  currency: z.string().min(1, "Mata uang wajib diisi"),
  enableShipping: z.boolean().default(false),
  couriers: courierListSchema.default([]),
});

export type StoreSettingsFormData = z.infer<typeof storeSettingsSchema>;

export const stockUpdateSchema = z.object({
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
});
