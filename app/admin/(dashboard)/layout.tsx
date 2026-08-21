import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import AdminShell from "@/components/admin/AdminShell";
import AdminThemeProvider from "@/components/admin/AdminThemeProvider";
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
      <AdminThemeProvider>
        <AdminShell user={admin}>{children}</AdminShell>
      </AdminThemeProvider>
    </ToastProvider>
  );
}