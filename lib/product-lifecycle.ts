import {
  productLifecycleRowSchema,
  type ProductLifecycleAction,
} from "@/lib/validations/productLifecycleSchema";

export type ProductLifecycleState = "ACTIVE" | "ARCHIVED" | "TRASHED";
export type ProductLifecycleFilter = "current" | "archived" | "trashed";
export type ProductLifecycleType = "b2b_system" | "sparepart";

export function readProductLifecycle(
  value: unknown
): { state: ProductLifecycleState; version: number; productType: ProductLifecycleType } | null {
  const row = productLifecycleRowSchema.safeParse(value);
  if (!row.success) return null;
  const state: ProductLifecycleState =
    row.data.deleted_at === null
      ? "ACTIVE"
      : row.data.trashed_at === null
        ? "ARCHIVED"
        : "TRASHED";
  return {
    state,
    version: row.data.lifecycle_version,
    productType: row.data.product_type,
  };
}

export function lifecycleActions(
  state: ProductLifecycleState,
  permissions: { canManage: boolean; canRestoreTrashed: boolean }
): ProductLifecycleAction[] {
  if (state === "ACTIVE") return permissions.canManage ? ["archive"] : [];
  if (state === "ARCHIVED") return permissions.canManage ? ["restore_to_draft", "trash"] : [];
  return permissions.canRestoreTrashed ? ["restore_to_archive"] : [];
}

export function getLifecycleActionCopy(
  action: ProductLifecycleAction,
  productType: ProductLifecycleType
): { label: string; confirmLabel: string; description: string; tone: "primary" | "danger" } {
  const noun = productType === "sparepart" ? "Komponen" : "Produk B2B";
  switch (action) {
    case "archive":
      return {
        label: "Arsipkan Produk",
        confirmLabel: "Arsipkan",
        description: `${noun} akan masuk ke Arsip dan tidak lagi tampil di halaman publik.`,
        tone: "primary",
      };
    case "restore_to_draft":
      return {
        label: "Pulihkan",
        confirmLabel: "Pulihkan",
        description: `${noun} akan kembali ke daftar Aktif sebagai draf nonaktif dan tidak otomatis tayang di halaman publik.`,
        tone: "primary",
      };
    case "trash":
      return {
        label: "Hapus",
        confirmLabel: "Hapus ke Sampah",
        description: `${noun} akan dipindahkan ke Sampah dan disembunyikan dari daftar Arsip. Hanya Super Admin yang dapat memulihkannya.`,
        tone: "danger",
      };
    case "restore_to_archive":
      return {
        label: "Pulihkan ke Arsip",
        confirmLabel: "Pulihkan ke Arsip",
        description: `${noun} akan dikembalikan dari Sampah ke daftar Arsip (belum tayang publik).`,
        tone: "primary",
      };
  }
}

export const PRODUCT_EMPTY_STATES: Record<
  "products" | "components",
  Record<ProductLifecycleFilter, { title: string; description: string }>
> = {
  products: {
    current: {
      title: "Belum ada produk B2B aktif",
      description: "Tambahkan produk B2B baru atau pulihkan produk dari Arsip sebagai draf.",
    },
    archived: {
      title: "Arsip produk B2B kosong",
      description: "Produk B2B yang diarsipkan dapat dipulihkan sebagai draf atau dihapus ke Sampah.",
    },
    trashed: {
      title: "Sampah produk B2B kosong",
      description: "Produk B2B yang dihapus dari Arsip akan muncul di sini untuk dipulihkan oleh Super Admin.",
    },
  },
  components: {
    current: {
      title: "Belum ada komponen aktif",
      description: "Tambahkan komponen beserta harga, stok, dan berat untuk mulai berjualan.",
    },
    archived: {
      title: "Arsip komponen kosong",
      description: "Komponen yang diarsipkan dapat dipulihkan sebagai draf atau dihapus ke Sampah.",
    },
    trashed: {
      title: "Sampah komponen kosong",
      description: "Komponen yang dihapus dari Arsip akan muncul di sini untuk dipulihkan oleh Super Admin.",
    },
  },
};
