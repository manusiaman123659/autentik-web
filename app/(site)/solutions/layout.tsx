import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solusi Industri & IoT | PT Autentik Karya Analitika",
  description:
    "Pemantauan kualitas & telemetri IoT, rekayasa furnitur laboratorium, kalibrasi dan perawatan alat, pengolahan air industri, integrasi platform cloud & analytics, serta konsultasi teknis dan pendampingan audit standardisasi.",
};

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}