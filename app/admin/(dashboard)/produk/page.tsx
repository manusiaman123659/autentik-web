import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { listProductsByType } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, statusTone } from "@/components/admin/ui";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = {
  title: "Produk Utama (B2B) | Autentik CMS",
};

export default async function AdminProdukPage() {
  const products = await listProductsByType("b2b_system");

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Produk Utama (B2B)"
        description="Produk bertipe b2b_system yang tampil di halaman /katalog-produk"
        actionLabel="Tambah Produk"
        actionHref="/admin/produk/new"
      />

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Belum ada produk B2B"
          description="Tambahkan produk utama yang ingin tampil di katalog produk situs."
          actionHref="/admin/produk/new"
          actionLabel="Tambah Produk"
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Produk</Th>
              <Th>Merek</Th>
              <Th>Kategori</Th>
              <Th>Status</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
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
                        href={`/admin/produk/${p.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block truncate"
                      >
                        {p.name}
                      </Link>
                      <span className="text-xs text-slate-400">/{p.slug}</span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: p.brand_color ?? undefined }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: p.brand_color ?? "#94a3b8" }}
                    />
                    {p.brand}
                  </span>
                </Td>
                <Td>
                  <Badge label={p.category} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                </Td>
                <Td>
                  <Badge tone={statusTone(p.status)}>{p.status === "published" ? "Tayang" : "Draf"}</Badge>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <Link
                    href={`/admin/produk/${p.id}`}
                    className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteProductButton id={p.id} redirectTo="/admin/produk" />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}