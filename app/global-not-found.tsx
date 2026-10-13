import DocumentRoot from "@/components/layout/DocumentRoot";
import NotFoundContent from "@/components/layout/NotFoundContent";

export const metadata = { robots: { index: false, follow: false } };

export default function GlobalNotFound() {
  return <DocumentRoot lang="id"><NotFoundContent /></DocumentRoot>;
}
