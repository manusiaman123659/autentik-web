import { requireSectionAccess } from "@/lib/admin";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSectionAccess("akses-staff");
  return children;
}
