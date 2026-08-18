-- 0014: tautkan produk ke merek berdasarkan nama (brand_id backfill).
-- Kolom products.brand_id (FK -> brands.id, on delete set null) sudah ada sejak
-- 0001_schema.sql tapi tidak pernah diisi lewat admin. Produk dengan nama merek
-- yang cocok dengan brands.name (case-insensitive) di-link di sini.

update public.products p
set brand_id = b.id
from public.brands b
where p.brand_id is null
  and lower(b.name) = lower(p.brand);

create index if not exists idx_products_brand_id
  on public.products (brand_id);