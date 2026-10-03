import { requireSectionAccess } from "@/lib/admin";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSectionAccess("riwayat");
  return children;
}
