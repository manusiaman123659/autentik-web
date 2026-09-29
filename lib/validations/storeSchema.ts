import { z } from "zod";

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

export const storeSettingsSchema = z.object({
  currency: z.string().min(1, "Mata uang wajib diisi"),
  enableShipping: z.boolean().default(false),
  couriers: z.array(z.string()).default([]),
});

export type StoreSettingsFormData = z.infer<typeof storeSettingsSchema>;

export const stockUpdateSchema = z.object({
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
});
