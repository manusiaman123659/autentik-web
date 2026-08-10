import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import AdminShell from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <ToastProvider>
      <AdminShell user={admin}>{children}</AdminShell>
    </ToastProvider>
  );
}