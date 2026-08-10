import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td } from "@/components/admin/ui";
import StockEditor from "@/components/admin/StockEditor";

export const metadata: Metadata = {
  title: "Stok & Varian | Autentik CMS",
};

export default async function AdminStokPage() {
  const products = await listProductsByType("sparepart");

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Stok & Varian"
        description="Atur jumlah stok sparepart. Gunakan tombol +/- untuk penyesuaian cepat."
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Boxes size={26} />}
          title="Belum ada sparepart"
          description="Tambahkan sparepart terlebih dahulu untuk mengelola stok."
          actionHref="/admin/sparepart/new"
          actionLabel="Tambah Sparepart"
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <Badge key={c} label={c} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
            ))}
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>Sparepart</Th>
                <Th>Kategori</Th>
                <Th>Varian</Th>
                <Th className="text-center">Stok</Th>
                <Th className="text-center">Batas Menipis</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.stock ?? 0;
                const low = p.low_stock_threshold ?? 5;
                const variantCount = p.variants?.length ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <Td>
                      <Link
                        href={`/admin/sparepart/${p.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate max-w-[260px]"
                      >
                        {p.name}
                      </Link>
                      <span className="text-xs text-slate-400">{p.sku ?? "tanpa SKU"}</span>
                    </Td>
                    <Td>
                      <Badge label={p.category} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                    </Td>
                    <Td>
                      {variantCount > 0 ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{variantCount} varian</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-center">
                      <StockEditor productId={p.id} initial={stock} />
                    </Td>
                    <Td className="text-center">
                      <Badge tone={stock <= low ? "red" : "green"}>{low} pcs</Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  );
}