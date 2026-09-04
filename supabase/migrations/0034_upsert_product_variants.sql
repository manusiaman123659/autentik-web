-- Migration 0034: upsert_product_variants (diff-based, atomic)
-- Berlaku untuk: admin CRUD produk sparepart
-- Alasan: simpan per-row variant (label, sku, price_override, stock) secara atomic
-- Security: SECURITY DEFINER + is_staff() guard (defense-in-depth)

create or replace function public.upsert_product_variants(
  p_product_id text,
  p_variants jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_id   uuid;
begin
  -- DEFENSE-IN-DEPTH: guard staf (server action sudah check getAdminUser(),
  -- tapi RPC bisa dipanggil langsung dari browser oleh user login apapun)
  if not public.is_staff() then
    raise exception 'Akses ditolak. Hanya staff yang dapat mengelola varian produk.';
  end if;

  -- guard input valid
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Data varian tidak valid.';
  end if;

  -- guard: produk harus ada
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produk tidak ditemukan.';
  end if;

  -- 1. SOFT DELETE: varian existing yang tidak ada di list baru
  update public.product_variants
     set deleted_at = now(),
         is_active  = false
   where product_id = p_product_id
     and deleted_at is null
     and id not in (
       select (item->>'id')::uuid
         from jsonb_array_elements(p_variants) as item
        where item->>'id' is not null and item->>'id' != ''
     );

  -- 2. UPSERT: INSERT baru + UPDATE existing
  for v_item in select * from jsonb_array_elements(p_variants)
  loop
    v_id := nullif(v_item->>'id', '')::uuid;

    if v_id is not null then
      -- UPDATE existing row
      update public.product_variants
         set label          = v_item->>'label',
             sku            = nullif(v_item->>'sku', ''),
             price_override = case
                                when v_item->>'price_override' = '' then null
                                else (v_item->>'price_override')::numeric
                              end,
             stock          = (v_item->>'stock')::int,
             variant_group  = nullif(v_item->>'variant_group', ''),
             sort_order     = coalesce((v_item->>'sort_order')::int, 0),
             is_active      = true,
             deleted_at     = null,
             updated_at     = now()
       where id = v_id
         and product_id = p_product_id;
    else
      -- INSERT baru
      insert into public.product_variants
        (product_id, label, sku, price_override, stock, variant_group, sort_order)
      values (
        p_product_id,
        v_item->>'label',
        nullif(v_item->>'sku', ''),
        case
          when v_item->>'price_override' = '' then null
          else (v_item->>'price_override')::numeric
        end,
        (v_item->>'stock')::int,
        nullif(v_item->>'variant_group', ''),
        coalesce((v_item->>'sort_order')::int, 0)
      );
    end if;
  end loop;
end;
$$;

-- Grant hanya ke authenticated (bukan anon, bukan public)
grant execute on function public.upsert_product_variants(text, jsonb) to authenticated;

-- Reload skema PostgREST
notify pgrst, 'reload schema';
