import DocumentRoot from "@/components/layout/DocumentRoot";
import { siteMetadata } from "@/i18n/metadata";

export const metadata = siteMetadata;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <DocumentRoot lang="id">{children}</DocumentRoot>;
}
