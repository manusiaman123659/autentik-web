import type { Metadata } from "next";
import CustomerAuthGuard from "@/components/auth/CustomerAuthGuard";
import OrderHistoryList from "@/components/store/OrderHistoryList";

export const metadata: Metadata = {
  title: "Riwayat Pesanan | PT Autentik Karya Analitika",
  description: "Lihat daftar pesanan yang telah Anda buat di store kami.",
};

export const dynamic = "force-dynamic";

export default function OrderHistoryPage() {
  return (
    <CustomerAuthGuard>
      <OrderHistoryList />
    </CustomerAuthGuard>
  );
}
