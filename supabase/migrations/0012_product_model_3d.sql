-- ---------------------------------------------------------------------------
-- Product 3D model (.glb): add an optional 3D model URL for B2B products.
-- The .glb object is stored in the existing public 'media' bucket (policies
-- from 0004_media_storage_policies.sql already allow staff uploads). This
-- column only holds the public URL. Sparepart products keep this column NULL.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists model_3d_url text;

-- Pick up the new column in the PostgREST schema cache
notify pgrst, 'reload schema';
