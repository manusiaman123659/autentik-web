-- 0052_order_reference_integrity.sql
-- Preserve historical product and variant attribution on order items.

BEGIN;

-- Historical order item references must not disappear when catalog rows are
-- removed. Normal catalog removal is handled through soft-delete.
ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE RESTRICT;

ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_variant_id_fkey,
  ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.product_variants(id)
    ON DELETE RESTRICT;

ALTER TABLE public.product_variants
  DROP CONSTRAINT product_variants_product_id_fkey,
  ADD CONSTRAINT product_variants_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE RESTRICT;

-- Checkout writes order_items through SECURITY DEFINER functions. API roles
-- only need SELECT access; function owners and service_role remain unaffected.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_items
  FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.order_items
  TO service_role;

-- Admin catalog removal uses an UPDATE that sets deleted_at. Keep UPDATE but
-- prevent API roles from physically deleting product rows.
REVOKE DELETE ON TABLE public.products
  FROM PUBLIC, anon, authenticated;
GRANT DELETE ON TABLE public.products
  TO service_role;

-- Replace overlapping permissive public policies with one canonical rule.
-- Staff policies remain unchanged and continue to expose all catalog states.
DROP POLICY IF EXISTS products_public_select ON public.products;
DROP POLICY IF EXISTS products_select_published ON public.products;

CREATE POLICY products_public_select ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND is_active = true
    AND deleted_at IS NULL
  );

-- Public variants are visible only when both the variant and its parent
-- product are publicly visible. Staff policies remain unchanged.
DROP POLICY IF EXISTS product_variants_public_select ON public.product_variants;

CREATE POLICY product_variants_public_select ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = product_variants.product_id
        AND products.status = 'published'
        AND products.is_active = true
        AND products.deleted_at IS NULL
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
