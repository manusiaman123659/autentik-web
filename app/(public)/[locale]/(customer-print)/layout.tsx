import type { Metadata } from "next";
import "@/app/(print)/print.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CustomerPrintLayout({ children }: { children: React.ReactNode }) {
  return <main className="print-preview">{children}</main>;
}
