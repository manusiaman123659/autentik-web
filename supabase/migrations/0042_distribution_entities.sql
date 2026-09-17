-- =============================================================================
-- Autentik CMS - Jaringan distribusi
--
-- Direktori kanal distribusi grup, distributor, dan sub-distributor. Customer
-- tetap diarahkan ke MIKA; tabel ini tidak menyimpan relasi produk maupun
-- menentukan jalur pembelian secara otomatis.
-- =============================================================================

CREATE TABLE public.distribution_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  short_name text,
  distribution_type text NOT NULL,
  parent_id uuid REFERENCES public.distribution_entities(id) ON DELETE SET NULL,
  market_segment text,
  region_label text,
  city text,
  province text,
  address text,
  phone text,
  email text,
  website_url text,
  contact_name text,
  logo_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distribution_entities_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT distribution_entities_type_check CHECK (
    distribution_type IN ('group_distribution', 'distributor', 'sub_distributor')
  ),
  CONSTRAINT distribution_entities_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT distribution_entities_parent_check CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE UNIQUE INDEX distribution_entities_name_active_key
  ON public.distribution_entities (lower(btrim(name)))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_distribution_entities_parent
  ON public.distribution_entities (parent_id);

CREATE INDEX idx_distribution_entities_public
  ON public.distribution_entities (sort_order, name)
  WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE public.distribution_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distribution_entities_public_select"
  ON public.distribution_entities
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "distribution_entities_staff_select"
  ON public.distribution_entities
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_staff()));

CREATE POLICY "distribution_entities_staff_insert"
  ON public.distribution_entities
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_staff()));

CREATE POLICY "distribution_entities_staff_update"
  ON public.distribution_entities
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

CREATE TRIGGER set_distribution_entities_updated_at
  BEFORE UPDATE ON public.distribution_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON public.distribution_entities FROM PUBLIC;
REVOKE ALL ON public.distribution_entities FROM anon;
REVOKE ALL ON public.distribution_entities FROM authenticated;
GRANT SELECT ON public.distribution_entities TO anon;
GRANT SELECT, INSERT, UPDATE ON public.distribution_entities TO authenticated;
GRANT ALL ON public.distribution_entities TO service_role;

INSERT INTO public.distribution_entities (
  id,
  name,
  short_name,
  distribution_type,
  market_segment,
  logo_url,
  description,
  sort_order
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'PT Mitra Karya Analitika',
    'MIKA',
    'group_distribution',
    'Industrial & Healthcare Market Segment',
    '/images/grup_kami/mitra karya analitika.png',
    'Marketing dan Distribusi',
    0
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'CV Agra Prima Indonesia',
    NULL,
    'group_distribution',
    'Academic & Agriculture Market Segment',
    '/images/grup_kami/agra_prima.png',
    'Marketing dan Distribusi',
    1
  );

NOTIFY pgrst, 'reload schema';
