-- =============================================================================
-- Autentik CMS - Hapus permanen pesanan (hanya status cancelled)
-- Apply after 0018_order_cancel_restock.sql. File additive (0019).
--   - delete_order(uuid): hapus permanen pesanan + order_items (cascade),
--     ATOMIK dalam 1 transaksi (row lock).
--   - Guard: HANYA pesanan berstatus 'cancelled' yang boleh dihapus —
--     menjamin stok sudah dikembalikan oleh cancel_order (0018) sehingga
--     penghapusan tidak merusak catatan stok/finansial.
--   - Order tidak ditemukan => return false (no-op), bukan error.
--   - Dipanggil dari server action deleteOrder (lib/actions/store.ts).
--
-- KNOWN LIMITATIONS (diakui, bukan blocker):
--  1) Menghapus order menghapus baris order_items (cascade) dan membuat entri
--     audit lama (order.created/status_changed/stock_restored) jadi "yatim"
--     (audit_log tidak punya FK, tetap tersimpan). Diterima — fitur ini untuk
--     bersih-bersih order uji/sampah yang sudah cancelled.
-- =============================================================================

create or replace function public.delete_order(
  p_order_id uuid
)
returns boolean  -- true = berhasil dihapus; false = tidak ditemukan (no-op)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  -- staf only (defense-in-depth; caller action sudah guard getAdminUser())
  if not public.is_staff() then
    raise exception 'Hanya staf yang dapat menghapus pesanan.';
  end if;

  if p_order_id is null then
    raise exception 'ID pesanan wajib diisi.';
  end if;

  -- kunci baris order -> serialisasi hapus bersamaan & baca status
  select id, status into v_order
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    return false; -- no-op
  end if;

  -- guard: hanya cancelled (stok sudah dikembalikan oleh cancel_order)
  if v_order.status <> 'cancelled' then
    raise exception 'Hanya pesanan berstatus Dibatalkan yang dapat dihapus. Batalkan pesanan dulu agar stok dikembalikan.';
  end if;

  -- order_items ikut terhapus via on delete cascade (0002_store_orders.sql)
  delete from public.orders where id = p_order_id;

  return true;
end;
$$;

-- hanya staf (authenticated + is_staff() guard di dalam); bukan anon
grant execute on function public.delete_order(uuid) to authenticated;