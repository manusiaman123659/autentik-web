"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, TableShell, Th, Td, inputClass, statusTone } from "@/components/admin/ui";
import { Handshake } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import PaginationBar from "@/components/admin/PaginationBar";
import { deletePortfolio, setPortfolioStatus } from "@/lib/actions/portfolio";
import { PORTFOLIO_KIND_LABELS, type PortfolioRow } from "@/lib/portfolio-types";

export default function PortfolioListClient({ entries }: { entries: PortfolioRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<PortfolioRow | null>(null);
  const [busy, startTransition] = useTransition();
  const filtered = entries.filter(entry => (status === "all" || entry.status === status)
    && `${entry.title} ${entry.organization_name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));

  function mutate(entry: PortfolioRow, remove = false) {
    startTransition(async () => {
      try {
        const result = remove ? await deletePortfolio(entry.id)
          : await setPortfolioStatus(entry.id, entry.status === "published" ? "draft" : "published");
        toast(result.success ? "success" : "error", result.message);
        if (result.success) { setPendingDelete(null); router.refresh(); }
      } catch { toast("error", "Gagal memperbarui entri. Coba kembali."); }
    });
  }

  return <div className="space-y-4">
    <Card className="flex flex-col gap-3 p-4 sm:flex-row">
      <input aria-label="Cari portofolio" placeholder="Cari judul atau organisasi…" className={inputClass} value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }} />
      <select aria-label="Filter status" className={inputClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
        <option value="all">Semua status</option><option value="draft">Draft</option><option value="published">Published</option>
      </select>
    </Card>
    {filtered.length === 0 ? <EmptyState icon={<Handshake size={26} />} title="Belum ada entri yang cocok" description="Tambahkan entri baru atau sesuaikan pencarian." /> :
      <TableShell>
        <thead><tr><Th>Judul</Th><Th>Jenis</Th><Th>Status</Th><Th>Urutan</Th><Th>Aksi</Th></tr></thead>
        <tbody>{filtered.slice((safePage - 1) * 8, safePage * 8).map(entry => <tr key={entry.id}>
          <Td><Link className="font-semibold hover:text-[#0EA5A0]" href={`/admin/portfolio/${entry.id}`}>{entry.title}</Link></Td>
          <Td>{PORTFOLIO_KIND_LABELS[entry.entry_kind]}</Td>
          <Td><Badge tone={statusTone(entry.status)} label={entry.status === "published" ? "Published" : "Draft"} /></Td>
          <Td>{entry.sort_order}</Td>
          <Td><div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link className="text-[#0EA5A0] hover:underline" href={`/admin/portfolio/${entry.id}`}>Edit</Link>
            <button disabled={busy} type="button" className="text-[#0EA5A0] hover:underline disabled:opacity-50" onClick={() => mutate(entry)}>{entry.status === "published" ? "Jadikan Draft" : "Publikasikan"}</button>
            <button disabled={busy} type="button" className="text-red-500 hover:underline disabled:opacity-50" onClick={() => setPendingDelete(entry)}>Hapus</button>
          </div></Td>
        </tr>)}</tbody>
      </TableShell>}
    <PaginationBar totalItems={filtered.length} itemsPerPage={8} page={safePage} onPageChange={setPage} noun="entri" />
    {pendingDelete && <ConfirmDialog title={`Hapus "${pendingDelete.title}"?`}
      description="Entri dihapus permanen dan tidak lagi tampil publik. File gambar tetap disimpan karena mungkin digunakan entri lain."
      busy={busy} onCancel={() => setPendingDelete(null)} onConfirm={() => mutate(pendingDelete, true)} />}
  </div>;
}
