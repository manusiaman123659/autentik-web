import type { Metadata } from "next";
import { listPublicCareers, getRecruitmentUrl } from "@/lib/public-data";
import CareersClient from "./CareersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Karir & Peluang Kerja | PT Autentik Karya Analitika",
  description:
    "Kami mencari talenta-talenta terbaik untuk bergabung bersama kami dalam menghadirkan solusi teknologi pintar bagi kehidupan yang lebih baik.",
};

export default async function CareersPage() {
  const [jobs, recruitmentUrl] = await Promise.all([
    listPublicCareers(),
    getRecruitmentUrl(),
  ]);

  return <CareersClient jobs={jobs} recruitmentUrl={recruitmentUrl} />;
}
