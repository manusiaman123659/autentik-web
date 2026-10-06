import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { listCareers, getRecruitmentUrlSetting } from "@/lib/admin-data";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import CareerListClient from "@/components/admin/CareerListClient";
import RecruitmentForm from "@/components/admin/RecruitmentForm";

export const metadata: Metadata = {
  title: "Karir | Autentik CMS",
};

export default async function AdminKarirPage() {
  const careers = await listCareers();
  const recruitmentUrl = await getRecruitmentUrlSetting();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Karir"
        description="Arsip lowongan lokal. Lowongan publik berasal dari Recruitment API PT Autentik Karya Analitika; arsip ini tidak dipublikasikan sebagai fallback."
        actionLabel="Tambah Lowongan"
        actionHref="/admin/karir/new"
      />

      <div className="mb-8">
        <RecruitmentForm initialUrl={recruitmentUrl} />
      </div>

      {careers.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={26} />}
          title="Belum ada lowongan"
          description="Tambahkan arsip lowongan lokal. Lowongan publik dikelola melalui Recruitment API."
          actionHref="/admin/karir/new"
          actionLabel="Tambah Lowongan"
        />
      ) : (
        <CareerListClient careers={careers} />
      )}
    </div>
  );
}
