-- ---------------------------------------------------------------------------
-- Product brochure (PDF): add an optional downloadable brochure/catalog link
-- for B2B products. The PDF object is stored in the existing public 'media'
-- bucket (policies from 0004_media_storage_policies.sql already allow staff
-- insert/select/update/delete). This column only holds the public URL.
-- Sparepart products keep this column NULL.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists brochure_url text;

-- Pick up the new column in the PostgREST schema cache
notify pgrst, 'reload schema';
