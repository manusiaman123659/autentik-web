import type { Metadata } from "next";
import {
  getCompaniesFromJobs,
  getDepartmentsFromJobs,
} from "@/lib/api/mika-career";
import { getPublicCareerListings, getRecruitmentUrl } from "@/lib/public-data";
import CareersClient from "./CareersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mika Career — Lowongan Kerja & Karir | PT Autentik Karya Analitika",
  description:
    "Jelajahi lowongan kerja terbaru di Mika Career dan temukan peluang untuk berkarya bersama perusahaan dalam grup kami.",
};

export default async function CareersPage() {
  const [careerListings, recruitmentUrl] = await Promise.all([
    getPublicCareerListings({ page: 1, per_page: 10 }),
    getRecruitmentUrl(),
  ]);
  const sourceJobs =
    careerListings.source === "mika"
      ? careerListings.response.data
      : careerListings.fallbackJobs;
  const departments = getDepartmentsFromJobs(sourceJobs);
  const companies = getCompaniesFromJobs(sourceJobs);

  return (
    <CareersClient
      initialJobs={careerListings.response.data}
      initialMeta={careerListings.response.meta}
      departments={departments}
      companies={companies}
      recruitmentUrl={recruitmentUrl}
      apiMessage={careerListings.response.message}
    />
  );
}
