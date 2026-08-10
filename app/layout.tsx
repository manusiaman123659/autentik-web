import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PT Autentik Karya Analitika | Smart Technology is Yours",
  description:
    "Solusi penyedia produk industri dengan teknologi IoT. PT Autentik Karya Analitika memproduksi dan memasarkan IoT Quality Monitoring Devices berbasis kebutuhan industri dan teknologi IoT.",
  openGraph: {
    title: "PT Autentik Karya Analitika | Smart Technology is Yours",
    description:
      "PT Autentik Karya Analitika — Solusi penyedia produk industri dengan teknologi IoT. Mempercayakan produksi lokal berjaya di negeri sendiri.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}