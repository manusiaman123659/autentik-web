-- =============================================================================
-- Autentik CMS - Product Hotspots (interactive 3D viewer annotations)
--
-- Tabel penyimpanan hotspot (titik interaktif) pada model 3D produk.
-- Hanya untuk product_type = 'b2b_system' — guard di-enforce di RPC
-- level (Fase 3), bukan cuma di UI.
--
-- Setiap hotspot punya koordinat 3D world-space (position_x/y/z) yang
-- di-render relatif terhadap grup model. Admin menentukan posisi lewat
-- klik-untuk-taruh di 3D viewer (Fase 2).
-- =============================================================================

-- 1. Buat tabel
CREATE TABLE public.product_hotspots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position_x    numeric NOT NULL,
  position_y    numeric NOT NULL,
  position_z    numeric NOT NULL,
  title         text NOT NULL,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Index
CREATE INDEX idx_product_hotspots_product_id ON public.product_hotspots(product_id);

CREATE INDEX idx_product_hotspots_active ON public.product_hotspots(product_id, sort_order)
  WHERE is_active = true AND deleted_at IS NULL;

-- 3. RLS — pola identik product_variants (migration 0032)
ALTER TABLE public.product_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_hotspots_public_select" ON public.product_hotspots
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "product_hotspots_staff_select" ON public.product_hotspots
  FOR SELECT USING (public.is_staff());

CREATE POLICY "product_hotspots_staff_all" ON public.product_hotspots
  FOR ALL USING (public.is_staff());

-- 4. Trigger updated_at (reuse fungsi dari 0001)
CREATE TRIGGER set_product_hotspots_updated_at
  BEFORE UPDATE ON public.product_hotspots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Grant — explicit, defense-in-depth
-- REVOKE default PUBLIC grants (consistency with 0035 pattern)
-- SELECT only untuk anon/authenticated (public read via RLS)
-- ALL untuk service_role (admin CRUD via server actions)
REVOKE ALL ON public.product_hotspots FROM PUBLIC;
GRANT SELECT ON public.product_hotspots TO anon, authenticated;
GRANT ALL ON public.product_hotspots TO service_role;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
