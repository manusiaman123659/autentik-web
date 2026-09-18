-- =============================================================================
-- Autentik CMS - Product Photo Hotspots
--
-- IDEMPOTENT RECONCILIATION MIGRATION
-- Migration ini dirancang untuk aman di-apply ulang setelah partial apply.
--
-- Setiap photo hotspot memiliki:
-- - target_image_url: URL foto produk yang ditandai (harus salah satu
--                     dari products.image_url atau products.gallery)
-- - position_x & position_y: persentase (0 - 100) dari koordinat foto
-- - title: judul fitur
-- - description: deskripsi penjelasan fitur
-- - callout_image_url: foto detail / close-up wajib untuk fitur tersebut
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. TABEL
-- IF NOT EXISTS menjamin tidak ada DROP/RECREATE & data tidak hilang.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_photo_hotspots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        text        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_image_url  text        NOT NULL,
  position_x        numeric     NOT NULL,
  position_y        numeric     NOT NULL,
  title             text        NOT NULL,
  description       text,
  callout_image_url text        NOT NULL,
  sort_order        integer     NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT true,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CHECK CONSTRAINTS
-- Pola DROP IF EXISTS + ADD untuk idempotent reconciliation.
-- Constraint non-0046 TIDAK disentuh.
-- ============================================================================
ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_target_url;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_target_url
    CHECK (length(btrim(target_image_url)) > 0);

ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_pos_x;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_pos_x
    CHECK (position_x BETWEEN 0 AND 100);

ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_pos_y;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_pos_y
    CHECK (position_y BETWEEN 0 AND 100);

ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_title;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_title
    CHECK (length(btrim(title)) > 0);

ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_callout_url;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_callout_url
    CHECK (length(btrim(callout_image_url)) > 0);

ALTER TABLE public.product_photo_hotspots
  DROP CONSTRAINT IF EXISTS chk_photo_hotspot_sort_order;
ALTER TABLE public.product_photo_hotspots
  ADD CONSTRAINT chk_photo_hotspot_sort_order
    CHECK (sort_order >= 0);

-- ============================================================================
-- 3. INDEXES
-- IF NOT EXISTS aman untuk re-apply.
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_product_photo_hotspots_product_id
  ON public.product_photo_hotspots(product_id);

CREATE INDEX IF NOT EXISTS idx_product_photo_hotspots_active
  ON public.product_photo_hotspots(product_id, target_image_url, sort_order)
  WHERE is_active = true AND deleted_at IS NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ENABLE ROW LEVEL SECURITY idempotent — aman jika sudah aktif.
-- ============================================================================
ALTER TABLE public.product_photo_hotspots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. POLICIES
-- DROP IF EXISTS sebelum CREATE untuk menghindari error 42710 pada re-apply.
-- ============================================================================

-- 5a. Public SELECT (anon & authenticated)
--     Hotspot tampil publik HANYA jika:
--       - hotspot sendiri aktif dan tidak soft-deleted
--       - produk induk bertipe b2b_system, berstatus published,
--         aktif, dan tidak soft-deleted
DROP POLICY IF EXISTS "product_photo_hotspots_public_select"
  ON public.product_photo_hotspots;

CREATE POLICY "product_photo_hotspots_public_select"
  ON public.product_photo_hotspots
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active  = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
        FROM public.products p
       WHERE p.id           = product_id
         AND p.product_type = 'b2b_system'
         AND p.status       = 'published'
         AND p.is_active    = true
         AND p.deleted_at   IS NULL
    )
  );

-- 5b. Staff SELECT (baca semua termasuk draft, soft-deleted, inactive)
DROP POLICY IF EXISTS "product_photo_hotspots_staff_select"
  ON public.product_photo_hotspots;

CREATE POLICY "product_photo_hotspots_staff_select"
  ON public.product_photo_hotspots
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- 5c. Staff ALL mutations (INSERT / UPDATE / DELETE)
--     WITH CHECK memastikan setiap row yang ditulis juga melewati is_staff().
--     Mutation langsung dari client diblokir policy ini untuk non-staff.
--     Dalam praktiknya mutasi SELALU melalui RPC SECURITY DEFINER.
DROP POLICY IF EXISTS "product_photo_hotspots_staff_all"
  ON public.product_photo_hotspots;

CREATE POLICY "product_photo_hotspots_staff_all"
  ON public.product_photo_hotspots
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ============================================================================
-- 6. TRIGGER updated_at
-- DROP IF EXISTS + CREATE untuk idempotent reconciliation.
-- Fungsi set_updated_at() sudah ada di project, tidak perlu dibuat ulang.
-- ============================================================================
DROP TRIGGER IF EXISTS set_product_photo_hotspots_updated_at
  ON public.product_photo_hotspots;

CREATE TRIGGER set_product_photo_hotspots_updated_at
  BEFORE UPDATE ON public.product_photo_hotspots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. GRANTS (least-privilege)
-- anon & authenticated hanya SELECT (dibatasi lebih lanjut oleh RLS).
-- Mutasi ke tabel HANYA melalui RPC SECURITY DEFINER.
-- service_role mendapat ALL untuk keperluan infrastruktur Supabase.
-- ============================================================================
REVOKE ALL ON public.product_photo_hotspots FROM PUBLIC;
GRANT SELECT ON public.product_photo_hotspots TO anon, authenticated;
GRANT ALL   ON public.product_photo_hotspots TO service_role;

-- ============================================================================
-- 8. RPC: upsert_product_photo_hotspots (CREATE OR REPLACE — selalu idempotent)
--
-- Guards yang dipertahankan:
--   Guard 1  — staff only
--   Guard 2  — payload harus JSON array valid
--   Guard 3  — produk harus ada, tidak deleted, dan bertipe b2b_system
--              (TIDAK mengharuskan status = 'published' agar admin dapat
--               mengedit produk yang masih draft)
--   Guard 4  — validasi per-item: koordinat, field wajib, dan MEDIA OWNERSHIP
--              * NEW hotspot: target_image_url harus ada di image_url atau gallery produk
--              * UPDATE hotspot dimana target_image_url BERUBAH: target baru
--                wajib ada di media produk saat ini
--              * UPDATE hotspot dimana target_image_url TIDAK BERUBAH: dibiarkan
--                meski foto tidak ada lagi di media (orphan preservation)
--   Guard 5  — cross-product mutation protection
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_product_photo_hotspots(
  p_product_id text,
  p_hotspots   jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item             jsonb;
  v_id               uuid;
  v_product_type     text;
  v_image_url        text;
  v_gallery          jsonb;
  v_pos_x            numeric;
  v_pos_y            numeric;
  v_title            text;
  v_callout_url      text;
  v_target_url       text;
  v_existing_target  text;     -- target_image_url yang sedang tersimpan di DB
  v_target_changed   boolean;  -- apakah target berubah dibandingkan DB
  v_target_is_valid  boolean;  -- apakah target baru ada dalam media produk
BEGIN
  -- ──────────────────────────────────────────────────────────────────────────
  -- Guard 1: Staff only
  -- ──────────────────────────────────────────────────────────────────────────
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Akses ditolak. Hanya staff yang dapat mengelola hotspot foto produk.';
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────
  -- Guard 2: Payload harus berupa JSON array
  -- ──────────────────────────────────────────────────────────────────────────
  IF p_hotspots IS NULL OR jsonb_typeof(p_hotspots) <> 'array' THEN
    RAISE EXCEPTION 'Data photo hotspot tidak valid: harus berupa JSON array.';
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────
  -- Guard 3: Produk harus ada, tidak deleted, dan bertipe b2b_system.
  --          Status published TIDAK diwajibkan agar admin dapat mengedit
  --          produk yang masih draft.
  --          Muat image_url & gallery untuk validasi media ownership (Guard 4).
  -- ──────────────────────────────────────────────────────────────────────────
  SELECT product_type, image_url, gallery
    INTO v_product_type, v_image_url, v_gallery
    FROM public.products
   WHERE id         = p_product_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan atau telah dihapus.';
  END IF;

  IF v_product_type <> 'b2b_system' THEN
    RAISE EXCEPTION 'Photo hotspot hanya tersedia untuk produk B2B System.';
  END IF;

  -- Pastikan gallery adalah JSON array (guard against NULL/malformed)
  IF v_gallery IS NULL OR jsonb_typeof(v_gallery) <> 'array' THEN
    v_gallery := '[]'::jsonb;
  END IF;

  -- ──────────────────────────────────────────────────────────────────────────
  -- Step 1: SOFT DELETE hotspot yang tidak ada dalam payload baru.
  --         Hotspot orphan (target foto sudah dihapus dari galeri) yang
  --         sengaja dimasukkan kembali dalam payload TIDAK dihapus.
  -- ──────────────────────────────────────────────────────────────────────────
  UPDATE public.product_photo_hotspots
     SET deleted_at = now(),
         is_active  = false
   WHERE product_id = p_product_id
     AND deleted_at IS NULL
     AND id NOT IN (
           SELECT (item->>'id')::uuid
             FROM jsonb_array_elements(p_hotspots) AS item
            WHERE item->>'id' IS NOT NULL
              AND item->>'id' <> ''
         );

  -- ──────────────────────────────────────────────────────────────────────────
  -- Step 2: UPSERT — UPDATE existing rows, INSERT new rows
  -- ──────────────────────────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_hotspots)
  LOOP
    v_id          := nullif(v_item->>'id', '')::uuid;
    v_pos_x       := (v_item->>'position_x')::numeric;
    v_pos_y       := (v_item->>'position_y')::numeric;
    v_title       := btrim(coalesce(v_item->>'title', ''));
    v_callout_url := btrim(coalesce(v_item->>'callout_image_url', ''));
    v_target_url  := btrim(coalesce(v_item->>'target_image_url', ''));

    -- Validasi rentang koordinat
    IF v_pos_x < 0 OR v_pos_x > 100 THEN
      RAISE EXCEPTION 'position_x harus antara 0 dan 100 (diterima: %).', v_pos_x;
    END IF;
    IF v_pos_y < 0 OR v_pos_y > 100 THEN
      RAISE EXCEPTION 'position_y harus antara 0 dan 100 (diterima: %).', v_pos_y;
    END IF;

    -- Validasi field wajib
    IF length(v_title) = 0 THEN
      RAISE EXCEPTION 'Judul hotspot tidak boleh kosong.';
    END IF;
    IF length(v_callout_url) = 0 THEN
      RAISE EXCEPTION 'Foto callout hotspot wajib diunggah.';
    END IF;
    IF length(v_target_url) = 0 THEN
      RAISE EXCEPTION 'URL foto target hotspot wajib diisi.';
    END IF;

    -- ────────────────────────────────────────────────────────────────────────
    -- Guard 4: Media Ownership Validation
    --
    -- Helper: apakah v_target_url valid dalam media produk saat ini?
    --   valid = (v_target_url = v_image_url)
    --           OR (v_target_url ada dalam v_gallery sebagai string element)
    -- ────────────────────────────────────────────────────────────────────────
    v_target_is_valid := (
      v_target_url = coalesce(v_image_url, '')
      OR v_gallery @> jsonb_build_array(v_target_url)
    );

    IF v_id IS NOT NULL THEN
      -- ── UPDATE path ────────────────────────────────────────────────────────

      -- Guard 5: Cross-product mutation protection
      SELECT target_image_url
        INTO v_existing_target
        FROM public.product_photo_hotspots
       WHERE id         = v_id
         AND product_id = p_product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Hotspot ID % tidak ditemukan atau bukan milik produk ini.', v_id;
      END IF;

      -- Apakah target_image_url berubah dibanding yang tersimpan?
      v_target_changed := (v_target_url IS DISTINCT FROM v_existing_target);

      IF v_target_changed THEN
        -- Target berubah → target BARU wajib ada di media produk saat ini.
        -- Ini mencegah assignment arbitrary URL sekaligus memungkinkan
        -- reassignment hotspot orphan ke foto lain yang valid.
        IF NOT v_target_is_valid THEN
          RAISE EXCEPTION
            'URL foto target "%" tidak ditemukan di media produk ini. '
            'Pilih salah satu foto yang sudah diunggah.',
            v_target_url;
        END IF;
      END IF;
      -- Jika target TIDAK berubah: izinkan meski foto sudah tidak ada
      -- di media produk (orphan preservation).

      -- UPDATE existing hotspot (termasuk un-delete jika sebelumnya soft-deleted)
      UPDATE public.product_photo_hotspots
         SET target_image_url  = v_target_url,
             position_x        = v_pos_x,
             position_y        = v_pos_y,
             title             = v_title,
             description       = nullif(v_item->>'description', ''),
             callout_image_url = v_callout_url,
             sort_order        = coalesce((v_item->>'sort_order')::int, 0),
             is_active         = true,
             deleted_at        = null,
             updated_at        = now()
       WHERE id         = v_id
         AND product_id = p_product_id;

    ELSE
      -- ── INSERT path ────────────────────────────────────────────────────────
      -- Hotspot baru: target WAJIB ada di media produk saat ini.
      IF NOT v_target_is_valid THEN
        RAISE EXCEPTION
          'URL foto target "%" tidak ditemukan di media produk ini. '
          'Pilih salah satu foto yang sudah diunggah.',
          v_target_url;
      END IF;

      INSERT INTO public.product_photo_hotspots
        (product_id, target_image_url, position_x, position_y,
         title, description, callout_image_url, sort_order)
      VALUES (
        p_product_id,
        v_target_url,
        v_pos_x,
        v_pos_y,
        v_title,
        nullif(v_item->>'description', ''),
        v_callout_url,
        coalesce((v_item->>'sort_order')::int, 0)
      );
    END IF;
  END LOOP;
END;
$$;

-- Grants untuk RPC: hanya authenticated (staff akan lulus Guard 1 di dalam RPC)
REVOKE EXECUTE ON FUNCTION public.upsert_product_photo_hotspots(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_product_photo_hotspots(text, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.upsert_product_photo_hotspots(text, jsonb) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
