-- =============================================================================
-- Autentik CMS - Restore stok otomatis saat order di-cancel
-- Apply after 0017_shipping_cost.sql. File additive (0018).
--   - cancel_order(uuid, text): transisi pesanan -> cancelled + mengembalikan
--     stok produk dari order_items, ATOMIK dalam 1 transaksi (row lock).
--   - Guard anti double-restore: status lama sudah 'cancelled' => no-op
--     (return false), mencegah restore ganda bila admin klik cancel 2x.
--   - Dipanggil dari server action updateOrderStatus (lib/actions/store.ts)
--     hanya saat status baru = 'cancelled'.
--
-- KNOWN LIMITATIONS (diakui, bukan blocker):
--  1) updateOrderStatus menulis ulang status/cancel_reason via patch biasa
--     setelah RPC sukses (non-atomik). Celah sempit: admin lain bisa nimpa
--     status di antara RPC & patch. Level risiko = sama seperti override
--     shipping/tracking yang sudah ada; bukan regresi task ini.
--  2) Row lock produk dalam loop tidak diurutkan -> teoritis deadlock bila 2
--     order beda cancel bersamaan menyentuh produk sama dgn urutan beda.
--     Postgres auto-detect & retry salah satu transaksi; bukan korupsi data.
--     Jika suatu saat di-hardening: urutkan order_items by product_id.
-- =============================================================================

create or replace function public.cancel_order(
  p_order_id      uuid,
  p_cancel_reason text default null
)
returns boolean  -- true = berhasil cancel + restore; false = sudah cancelled (no-op)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item  record;
begin
  -- staf only (defense-in-depth; caller action sudah guard getAdminUser())
  if not public.is_staff() then
    raise exception 'Hanya staf yang dapat membatalkan pesanan.';
  end if;

  if p_order_id is null then
    raise exception 'ID pesanan wajib diisi.';
  end if;

  -- kunci baris order -> serialisasi cancel bersamaan & baca status lama
  select id, status into v_order
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  -- guard anti double-restore: sudah cancelled -> no-op
  if v_order.status = 'cancelled' then
    return false;
  end if;

  -- restore stok per item order (row lock via UPDATE, atomik dlm transaksi)
  for v_item in
    select product_id, quantity
      from public.order_items
     where order_id = p_order_id
  loop
    update public.products
       set stock = stock + v_item.quantity
     where id = v_item.product_id;
    if not found then
      raise exception 'Produk "%" tidak ditemukan saat restore stok.', v_item.product_id;
    end if;
  end loop;

  -- transisi status
  update public.orders
     set status = 'cancelled',
         cancel_reason = coalesce(p_cancel_reason, cancel_reason)
   where id = p_order_id;

  return true;
end;
$$;

-- hanya staf (authenticated + is_staff() guard di dalam); bukan anon
grant execute on function public.cancel_order(uuid, text) to authenticated;