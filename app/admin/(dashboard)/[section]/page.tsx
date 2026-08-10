import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { ADMIN_SECTIONS, BUILT_SECTION_KEYS } from "@/lib/admin-sections";
import { SECTION_ICONS } from "@/components/admin/sectionIcons";
import Link from "next/link";

interface Props {
  params: Promise<{ section: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return ADMIN_SECTIONS.filter((s) => !BUILT_SECTION_KEYS.includes(s.key)).map((section) => ({
    section: section.key,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const meta = ADMIN_SECTIONS.find((s) => s.key === section && !BUILT_SECTION_KEYS.includes(s.key));
  return { title: `${meta?.label ?? "Bagian"} | Autentik CMS` };
}

export default async function AdminSectionPage({ params }: Props) {
  const { section } = await params;
  const meta = ADMIN_SECTIONS.find((s) => s.key === section);
  if (!meta || BUILT_SECTION_KEYS.includes(meta.key)) notFound();

  const Icon = SECTION_ICONS[meta.key];

  return (
    <div className="max-w-6xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0EA5A0] hover:underline mb-6"
      >
        <ArrowLeft size={15} />
        Kembali ke Dashboard
      </Link>

      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-[#0EA5A0]/10 text-[#0EA5A0] mb-5">
          <Icon size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {meta.label}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
          {meta.description}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <Construction size={14} />
          Modul ini sedang dalam tahap pengembangan
        </div>
      </div>
    </div>
  );
}