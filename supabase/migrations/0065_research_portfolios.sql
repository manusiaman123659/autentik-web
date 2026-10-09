BEGIN;

DO $$
BEGIN
  IF current_user <> 'postgres'
    OR to_regprocedure('public.has_cms_capability(text)') IS NULL
    OR to_regprocedure('public.set_updated_at()') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = to_regprocedure('public.can_manage_cms_media(text)')
        AND pg_get_userbyid(p.proowner) = 'postgres' AND p.prosecdef AND p.provolatile = 's'
        AND regexp_replace(p.prosrc, '[[:space:]]', '', 'g') = regexp_replace($baseline$
          SELECT public.is_super_admin() OR
            (split_part(p_path, '/', 1) IN ('products', 'brochures', 'models', 'documents')
              AND public.has_cms_capability('operations')) OR
            (split_part(p_path, '/', 1) IN ('brands', 'team', 'grup_kami', 'partners', 'distribution', 'compro')
              AND public.has_cms_capability('content'));
        $baseline$, '[[:space:]]', '', 'g')
    ) THEN
    RAISE EXCEPTION 'Baseline capability/media tidak sesuai 0061. Abort untuk review sebelum menambah portfolio.';
  END IF;
END;
$$;

CREATE TABLE public.research_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (title ~ '[^[:space:]]' AND char_length(title) <= 160),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 500),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  entry_kind text NOT NULL DEFAULT 'portfolio' CHECK (entry_kind IN ('portfolio', 'collaboration', 'trademark')),
  category_label text CHECK (category_label IS NULL OR char_length(category_label) <= 80),
  organization_name text CHECK (organization_name IS NULL OR char_length(organization_name) <= 200),
  image_url text CHECK (image_url IS NULL OR (btrim(image_url) <> '' AND char_length(image_url) <= 2048)),
  image_alt text CHECK (image_alt IS NULL OR char_length(image_alt) <= 200),
  image_caption text CHECK (image_caption IS NULL OR char_length(image_caption) <= 300),
  source_reference text CHECK (source_reference IS NULL OR char_length(source_reference) <= 300),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9999),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_portfolios_published_summary CHECK (status <> 'published' OR summary ~ '[^[:space:]]'),
  CONSTRAINT research_portfolios_published_image_alt CHECK (
    status <> 'published' OR image_url IS NULL OR (image_alt IS NOT NULL AND image_alt ~ '[^[:space:]]')
  )
);
CREATE INDEX research_portfolios_public_order_idx ON public.research_portfolios (sort_order, id) WHERE status = 'published';
CREATE TRIGGER research_portfolios_set_updated_at BEFORE UPDATE ON public.research_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.research_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY research_portfolios_public_select ON public.research_portfolios FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY research_portfolios_content_select ON public.research_portfolios FOR SELECT TO authenticated USING ((SELECT public.has_cms_capability('content')));
CREATE POLICY research_portfolios_content_insert ON public.research_portfolios FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_cms_capability('content')));
CREATE POLICY research_portfolios_content_update ON public.research_portfolios FOR UPDATE TO authenticated
  USING ((SELECT public.has_cms_capability('content'))) WITH CHECK ((SELECT public.has_cms_capability('content')));
CREATE POLICY research_portfolios_content_delete ON public.research_portfolios FOR DELETE TO authenticated USING ((SELECT public.has_cms_capability('content')));
REVOKE ALL ON public.research_portfolios FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.research_portfolios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.research_portfolios TO authenticated;
GRANT ALL ON public.research_portfolios TO service_role;

-- CREATE OR REPLACE retains the 0061 ACL: PUBLIC revoked; anon/authenticated/service_role execute.
CREATE OR REPLACE FUNCTION public.can_manage_cms_media(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_super_admin() OR
    (split_part(p_path, '/', 1) IN ('products', 'brochures', 'models', 'documents')
      AND public.has_cms_capability('operations')) OR
    (split_part(p_path, '/', 1) IN ('brands', 'team', 'grup_kami', 'partners', 'distribution', 'compro')
      AND public.has_cms_capability('content')) OR
    (p_path ~ '^portfolio/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]*[.](jpg|jpeg|png|webp)$'
      AND public.has_cms_capability('content'));
$$;

INSERT INTO public.research_portfolios
  (id, title, summary, entry_kind, category_label, organization_name, source_reference, status, sort_order)
VALUES
  ('a0650000-0000-4000-8000-000000000001', 'BBSPJPPI Semarang', 'Hilirisasi dan komersialisasi AIMS (Ambient Air) dan SPARING.', 'collaboration', 'Regulator', 'BBSPJPPI Semarang', 'Company Profile AKA 2026, halaman 36', 'published', 0),
  ('a0650000-0000-4000-8000-000000000002', 'Teknologi Pertanian Universitas Andalas (UNAND)', 'Data logger IoT untuk angka kecukupan panas.', 'collaboration', 'Akademik', 'Teknologi Pertanian Universitas Andalas (UNAND)', 'Company Profile AKA 2026, halaman 36', 'published', 1),
  ('a0650000-0000-4000-8000-000000000003', 'Teknik Mesin Universitas Andalas (UNAND)', 'Tata udara ruangan cerdas.', 'collaboration', 'Akademik', 'Teknik Mesin Universitas Andalas (UNAND)', 'Company Profile AKA 2026, halaman 36', 'published', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.research_portfolios
  (id, title, summary, entry_kind, category_label, organization_name, image_url, image_alt, image_caption, source_reference, status, sort_order)
VALUES
  ('a0650000-0000-4000-8000-000000000004', 'TALPHA', 'Trademark / Sertifikat Merek', 'trademark', 'Trademark / Sertifikat Merek', 'PT Autentik Karya Analitika', '/images/compro/slide-10.jpg', 'Sertifikat Merek TALPHA dan ePal milik PT Autentik Karya Analitika', 'Sertifikat Merek: TALPHA dan ePal', 'Company Profile AKA 2026, halaman 10', 'published', 3),
  ('a0650000-0000-4000-8000-000000000005', 'ePal', 'Trademark / Sertifikat Merek', 'trademark', 'Trademark / Sertifikat Merek', 'PT Autentik Karya Analitika', '/images/compro/slide-10.jpg', 'Sertifikat Merek TALPHA dan ePal milik PT Autentik Karya Analitika', 'Sertifikat Merek: TALPHA dan ePal', 'Company Profile AKA 2026, halaman 10', 'published', 4),
  ('a0650000-0000-4000-8000-000000000006', 'Cylab', 'Trademark / Sertifikat Merek', 'trademark', 'Trademark / Sertifikat Merek', 'PT Autentik Karya Analitika', '/images/compro/slide-11.jpg', 'Sertifikat Merek Cylab dan Ullun milik PT Autentik Karya Analitika', 'Sertifikat Merek: Cylab dan Ullun', 'Company Profile AKA 2026, halaman 11', 'published', 5),
  ('a0650000-0000-4000-8000-000000000007', 'Ullun', 'Trademark / Sertifikat Merek', 'trademark', 'Trademark / Sertifikat Merek', 'PT Autentik Karya Analitika', '/images/compro/slide-11.jpg', 'Sertifikat Merek Cylab dan Ullun milik PT Autentik Karya Analitika', 'Sertifikat Merek: Cylab dan Ullun', 'Company Profile AKA 2026, halaman 11', 'published', 6)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
