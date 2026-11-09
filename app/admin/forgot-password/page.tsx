import AdminRecoveryForm from "@/components/admin/AdminRecoveryForm";

export const metadata = { title: "Lupa Password Admin | Autentik CMS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return <AdminRecoveryForm mode="request" invalidLink={query.error === "recovery_invalid"} />;
}
