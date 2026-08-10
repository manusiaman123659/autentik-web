import type { Metadata } from "next";
import { History } from "lucide-react";
import { listAudit } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Riwayat Aktivitas | Autentik CMS",
};

function actionTone(action: string): "red" | "amber" | "slate" {
  if (action.includes("delete") || action.includes("cancelled")) return "red";
  if (action.includes("created") || action.includes("status")) return "amber";
  return "slate";
}

export default async function AdminRiwayatPage() {
  const audits = await listAudit(200);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Riwayat Aktivitas"
        description="Log aksi pengguna pada audit_log"
      />

      {audits.length === 0 ? (
        <EmptyState icon={<History size={26} />} title="Belum ada riwayat aktivitas" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Pengguna</Th>
              <Th>Aksi</Th>
              <Th>Entitas</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <Td className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDateTime(a.created_at)}</Td>
                <Td className="text-xs">{a.user_email ?? "—"}</Td>
                <Td>
                  <Badge tone={actionTone(a.action)}>{a.action}</Badge>
                </Td>
                <Td className="text-xs">{a.entity_type}</Td>
                <Td className="text-xs max-w-[260px]">
                  <span className="block truncate" title={a.details ? JSON.stringify(a.details) : ""}>
                    {a.details ? JSON.stringify(a.details) : a.entity_id ?? "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}