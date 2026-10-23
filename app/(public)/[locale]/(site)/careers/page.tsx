import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { publicMetadata } from "@/i18n/metadata";
import { getDepartmentsFromJobs } from "@/lib/api/mika-career";
import { getPublicCareerListings, getRecruitmentUrl } from "@/lib/public-data";
import CareersClient from "./CareersClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "careers.metadata" });
  return publicMetadata("/careers", locale, { title: t("title"), description: t("description") });
}

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
