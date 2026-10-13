import { Inter } from "next/font/google";
import "@/app/globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/seo/jsonLd";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export default function DocumentRoot({ children, lang = "id" }: { children: React.ReactNode; lang?: string }) {
  return <html lang={lang} className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
    <body className={`${inter.className} antialiased`}>
      <JsonLd data={organizationSchema()} />
      <ThemeProvider>{children}</ThemeProvider>
    </body>
  </html>;
}
