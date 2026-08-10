import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login Admin | Autentik CMS",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdminUser();
  if (admin) redirect("/admin");

  return <LoginClient />;
}