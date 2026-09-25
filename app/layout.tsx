import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/seo/jsonLd";
import { getCanonicalOrigin } from "@/lib/public-url";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = getCanonicalOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PT Autentik Karya Analitika | Smart Technology is Yours",
  description:
    "Solusi penyedia produk industri dengan teknologi IoT. PT Autentik Karya Analitika memproduksi dan memasarkan IoT Quality Monitoring Devices berbasis kebutuhan industri dan teknologi IoT.",
  openGraph: {
    title: "PT Autentik Karya Analitika | Smart Technology is Yours",
    description:
      "PT Autentik Karya Analitika — Solusi penyedia produk industri dengan teknologi IoT. Mempercayakan produksi lokal berjaya di negeri sendiri.",
    type: "website",
    locale: "id_ID",
    siteName: "PT Autentik Karya Analitika",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.className} antialiased`}>
        <JsonLd data={organizationSchema()} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
