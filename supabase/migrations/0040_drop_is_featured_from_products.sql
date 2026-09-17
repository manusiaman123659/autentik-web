-- Reverse migration 0039: hapus kolom is_featured dari products.
-- Kolom ini sudah tidak dipakai setelah revert kode "Show Gallery".
DROP INDEX IF EXISTS idx_products_is_featured;
ALTER TABLE products DROP COLUMN IF EXISTS is_featured;
NOTIFY pgrst, 'reload schema';
