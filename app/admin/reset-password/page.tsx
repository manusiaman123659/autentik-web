import AdminRecoveryForm from "@/components/admin/AdminRecoveryForm";

export const metadata = { title: "Atur Ulang Kata Sandi Admin | Autentik CMS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <AdminRecoveryForm mode="reset" />;
}
