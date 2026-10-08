import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <main className="print-preview">{children}</main>;
}
