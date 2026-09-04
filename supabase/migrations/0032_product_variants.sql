-- ============================================
-- Migration A: product_variants table + order_items alter
-- ============================================

-- 1. Tabel product_variants
-- products.id bertipe text, product_id harus text untuk FK match
CREATE TABLE public.product_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_group   text,                          -- "Panjang", "Warna", atau NULL (single-axis / flattened)
  label           text NOT NULL,                 -- "1m", "3m", "1m - Merah"
  sku             text,                          -- kode part per varian (opsional)
  price_override  numeric(14,2),                 -- NULL = fallback ke products.price
  stock           integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  deleted_at      timestamptz,                   -- soft-delete (konsisten dengan products)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_product_variants_product_id
  ON public.product_variants(product_id);

-- Unique index dengan COALESCE + partial WHERE
-- COALESCE karena variant_group nullable; PostgreSQL anggap NULL = unik
-- tanpa COALESCE, constraint tidak mencegah duplicate "1m" untuk single-axis
CREATE UNIQUE INDEX idx_product_variants_product_group_label
  ON public.product_variants (product_id, COALESCE(variant_group, ''), label)
  WHERE deleted_at IS NULL;

-- Partial index untuk store display: varian aktif per produk
CREATE INDEX idx_product_variants_active
  ON public.product_variants(product_id)
  WHERE is_active = true AND deleted_at IS NULL;

-- 3. RLS policies (Pattern A + soft-delete)
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public: baca varian aktif (untuk StoreProductDetail)
CREATE POLICY "product_variants_public_select" ON public.product_variants
  FOR SELECT USING (
    deleted_at IS NULL AND is_active = true
  );

-- Staff: baca semua (termasuk draft, inactive, soft-deleted)
CREATE POLICY "product_variants_staff_select" ON public.product_variants
  FOR SELECT USING (public.is_staff());

-- Staff: INSERT/UPDATE/DELETE
CREATE POLICY "product_variants_staff_all" ON public.product_variants
  FOR ALL USING (public.is_staff());

-- 4. Trigger updated_at (reuse fungsi yang sudah ada dari 0001)
CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Alter order_items — tambah 2 kolom
-- variant_id: uuid karena FK ke product_variants.id yang uuid
-- Tidak perlu IF NOT EXISTS — migration 0032 sebelumnya gagal total,
-- tidak ada objek yang berhasil dibuat
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid
    REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN variant_label text;

-- Index untuk lookup order items berdasarkan varian
CREATE INDEX idx_order_items_variant_id
  ON public.order_items(variant_id)
  WHERE variant_id IS NOT NULL;

-- 6. Grant (hanya tabel, tidak ada sequence — pakai uuid, bukan serial)
GRANT ALL ON public.product_variants TO service_role;

-- 7. Reload PostgREST cache agar tabel baru + kolom baru langsung bisa diakses
NOTIFY pgrst, 'reload schema';
