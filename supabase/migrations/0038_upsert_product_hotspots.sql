-- =============================================================================
-- Autentik CMS - upsert_product_hotspots (diff-based, atomic)
-- Berlaku untuk: admin CRUD hotspot produk B2B
-- Guard tambahan: hanya produk tipe b2b_system
-- Security: SECURITY DEFINER + is_staff() guard (defense-in-depth)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_product_hotspots(
  p_product_id text,
  p_hotspots jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_id   uuid;
BEGIN
  -- Guard 1: is_staff()
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Akses ditolak. Hanya staff yang dapat mengelola hotspot produk.';
  END IF;

  -- Guard 2: input valid
  IF p_hotspots IS NULL OR jsonb_typeof(p_hotspots) <> 'array' THEN
    RAISE EXCEPTION 'Data hotspot tidak valid.';
  END IF;

  -- Guard 3: produk harus ada
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;

  -- Guard 4: hanya b2b_system
  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND product_type = 'b2b_system'
  ) THEN
    RAISE EXCEPTION 'Hotspot hanya tersedia untuk produk tipe b2b_system.';
  END IF;

  -- 1. SOFT DELETE: hotspot yang tidak ada di list baru
  UPDATE public.product_hotspots
     SET deleted_at = now(),
         is_active  = false
   WHERE product_id = p_product_id
     AND deleted_at IS NULL
     AND id NOT IN (
       SELECT (item->>'id')::uuid
         FROM jsonb_array_elements(p_hotspots) AS item
        WHERE item->>'id' IS NOT NULL AND item->>'id' != ''
     );

  -- 2. UPSERT: UPDATE existing + INSERT baru
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_hotspots)
  LOOP
    v_id := nullif(v_item->>'id', '')::uuid;

    IF v_id IS NOT NULL THEN
      UPDATE public.product_hotspots
         SET position_x  = (v_item->>'position_x')::numeric,
             position_y  = (v_item->>'position_y')::numeric,
             position_z  = (v_item->>'position_z')::numeric,
             title       = v_item->>'title',
             description = nullif(v_item->>'description', ''),
             sort_order  = coalesce((v_item->>'sort_order')::int, 0),
             is_active   = true,
             deleted_at  = null,
             updated_at  = now()
       WHERE id = v_id
         AND product_id = p_product_id;
    ELSE
      INSERT INTO public.product_hotspots
        (product_id, position_x, position_y, position_z, title, description, sort_order)
      VALUES (
        p_product_id,
        (v_item->>'position_x')::numeric,
        (v_item->>'position_y')::numeric,
        (v_item->>'position_z')::numeric,
        v_item->>'title',
        nullif(v_item->>'description', ''),
        coalesce((v_item->>'sort_order')::int, 0)
      );
    END IF;
  END LOOP;
END;
$$;

-- Grant hanya ke authenticated (anon TIDAK boleh — hotspot hanya dibaca publik via SELECT langsung)
REVOKE EXECUTE ON FUNCTION public.upsert_product_hotspots(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_product_hotspots(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_product_hotspots(text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
