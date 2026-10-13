import type { Metadata } from "next";
import DocumentRoot from "@/components/layout/DocumentRoot";
import { siteMetadata } from "@/i18n/metadata";
import "./print.css";

export const metadata: Metadata = { ...siteMetadata, robots: { index: false, follow: false } };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <DocumentRoot lang="id"><main className="print-preview">{children}</main></DocumentRoot>;
}
