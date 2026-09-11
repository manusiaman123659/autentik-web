import type { Metadata } from "next";
import { getMikaJobs, getMikaDepartments } from "@/lib/api/mika-career";
import { getRecruitmentUrl } from "@/lib/public-data";
import CareersClient from "./CareersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mika Career — Lowongan Kerja & Karir | PT Autentik Karya Analitika",
  description:
    "Jelajahi lowongan kerja terbaru di Mika Career. Kami mencari talenta unggul di bidang Fullstack Development, Hardware & IoT, Sales, dan Cloud Infrastructure.",
};

export default async function CareersPage() {
  const [jobsResponse, departments, recruitmentUrl] = await Promise.all([
    getMikaJobs({ page: 1, per_page: 10 }),
    getMikaDepartments(),
    getRecruitmentUrl(),
  ]);

  return (
    <CareersClient
      initialJobs={jobsResponse.data}
      initialMeta={jobsResponse.meta}
      departments={departments}
      recruitmentUrl={recruitmentUrl}
      apiMessage={jobsResponse.message}
    />
  );
}
