import type { Metadata } from "next";
import { getComproSettings } from "@/lib/admin-data";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import ComproForm from "@/components/admin/ComproForm";

export const metadata: Metadata = {
  title: "Company Profile | Autentik CMS",
};

export default async function AdminComproPage() {
  const compro = await getComproSettings();

  return (
    <div>
      <PageHeader
        title="Company Profile"
        description="Kelola presentasi company profile yang tampil di halaman /about (file PDF & judul)"
      />

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {compro.title}
              </h2>
              {compro.year && <Badge tone="teal">{compro.year}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {compro.pdfUrl
                ? `File PDF: ${compro.pdfFilename ?? "custom"}`
                : "Belum ada file kustom — situs memakai PDF bawaan."}
            </p>
          </div>
          {compro.pdfUrl ? (
            <a
              href={compro.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              Lihat PDF Saat Ini
            </a>
          ) : (
            <Badge tone="slate">Menggunakan PDF bawaan</Badge>
          )}
        </div>
      </Card>

      <ComproForm initial={compro} />
    </div>
  );
}