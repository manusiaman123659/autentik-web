"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductRow } from "@/lib/admin-data";
import { Badge, TableShell, Th, Td } from "@/components/admin/ui";
import StockEditor from "@/components/admin/StockEditor";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

export default function StockListClient({ products }: { products: ProductRow[] }) {
  const [page, setPage] = useState(1);

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((c) => (
          <Badge key={c} label={c} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
        ))}
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Komponen</Th>
            <Th>Kategori</Th>
            <Th>Varian</Th>
            <Th className="text-center">Stok</Th>
            <Th className="text-center">Batas Menipis</Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((p) => {
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

      <PaginationBar
        totalItems={products.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="komponen"
      />
    </div>
  );
}
