-- 0057_private_technical_documents.sql
-- Keep free documents in public media; gated documents live only in a private bucket.
-- No existing technical_documents rows require conversion at deployment time.

BEGIN;

ALTER TABLE public.technical_documents
  ALTER COLUMN file_url DROP NOT NULL,
  ADD COLUMN storage_path text;

ALTER TABLE public.technical_documents
  ADD CONSTRAINT technical_documents_storage_model_check CHECK (
    (requires_lead = true AND NULLIF(BTRIM(storage_path), '') IS NOT NULL AND file_url IS NULL)
    OR
    (requires_lead = false AND NULLIF(BTRIM(file_url), '') IS NOT NULL AND storage_path IS NULL)
  );

DROP POLICY IF EXISTS techdocs_public_select ON public.technical_documents;
CREATE POLICY techdocs_public_select ON public.technical_documents
  FOR SELECT TO anon, authenticated
  USING (
    requires_lead = false
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = technical_documents.product_id
        AND p.product_type = 'b2b_system'
        AND p.status = 'published'
        AND p.is_active = true
        AND p.deleted_at IS NULL
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('technical-documents', 'technical-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'technical-documents' AND public = false
  ) THEN
    RAISE EXCEPTION 'Bucket dokumen teknis harus privat.';
  END IF;
END;
$$;

-- A permissive staff policy enables admin browser upload/management.
CREATE POLICY technical_documents_objects_staff_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'technical-documents' AND public.is_staff())
  WITH CHECK (bucket_id = 'technical-documents' AND public.is_staff());

-- Restrictive guard also blocks access if another permissive Storage policy
-- happens to include this bucket. It has no effect on other buckets.
CREATE POLICY technical_documents_objects_private_guard ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'technical-documents' OR public.is_staff())
  WITH CHECK (bucket_id <> 'technical-documents' OR public.is_staff());

COMMIT;

NOTIFY pgrst, 'reload schema';
