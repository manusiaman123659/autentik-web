import type { Metadata } from "next";
import { getDepartmentsFromJobs } from "@/lib/api/mika-career";
import { getPublicCareerListings, getRecruitmentUrl } from "@/lib/public-data";
import CareersClient from "./CareersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lowongan Kerja & Karir | PT Autentik Karya Analitika",
  description:
    "Temukan lowongan kerja PT Autentik Karya Analitika melalui portal rekrutmen resmi.",
};

export default async function CareersPage() {
  const [careerListings, recruitmentUrl] = await Promise.all([
    getPublicCareerListings({ page: 1, per_page: 10 }),
    getRecruitmentUrl(),
  ]);
  const sourceJobs = careerListings.response.data;
  const departments = getDepartmentsFromJobs(sourceJobs);

  return (
    <CareersClient
      initialJobs={careerListings.response.data}
      initialMeta={careerListings.response.meta}
      departments={departments}
      available={careerListings.response.success}
      recruitmentUrl={recruitmentUrl}
      apiMessage={careerListings.response.message}
    />
  );
}
