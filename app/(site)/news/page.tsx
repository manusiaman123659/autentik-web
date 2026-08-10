import type { Metadata } from "next";
import CareersClient from "./CareersClient";

export const metadata: Metadata = {
  title: "Karir & Peluang Kerja | PT Autentik Karya Analitika",
  description:
    "Kami mencari talenta-talenta terbaik untuk bergabung bersama kami dalam menghadirkan solusi teknologi pintar bagi kehidupan yang lebih baik.",
};

export default function NewsPage() {
  return <CareersClient />;
}
