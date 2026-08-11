import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, statusTone, formatRupiah } from "@/components/admin/ui";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = {
  title: "Katalog Sparepart | Autentik CMS",
};

export default async function AdminSparepartPage() {
  const products = await listProductsByType("sparepart");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Katalog Sparepart"
        description="Produk bertipe sparepart yang tampil di halaman /store"
        actionLabel="Tambah Sparepart"
        actionHref="/admin/sparepart/new"
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Belum ada sparepart"
          description="Tambahkan sparepart beserta harga, stok, dan berat untuk mulai berjualan."
          actionHref="/admin/sparepart/new"
          actionLabel="Tambah Sparepart"
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Sparepart</Th>
              <Th>SKU</Th>
              <Th>Harga</Th>
              <Th>Stok</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.stock ?? 0;
              const low = p.low_stock_threshold ?? 5;
              const lowStock = stock > 0 && stock <= low;
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/sparepart/${p.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-slate-400">{p.brand}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs font-mono">{p.sku ?? "—"}</Td>
                  <Td className="font-semibold">{p.price != null ? formatRupiah(p.price) : "—"}</Td>
                  <Td>
                    <Badge tone={stock === 0 ? "red" : lowStock ? "amber" : "green"}>
                      {stock === 0 ? "Habis" : `${stock} pcs`}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(p.status)}>{p.status === "published" ? "Tayang" : "Draf"}</Badge>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Link
                      href={`/admin/sparepart/${p.id}`}
                      className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteProductButton id={p.id} name={p.name} redirectTo="/admin/sparepart" />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}