import { getAdminUser } from "@/lib/admin";
import { getDashboardStats, getRecentOrders, getRecentMessages, fmtRp } from "@/lib/admin-data";
import Link from "next/link";
import { ShoppingBag, Wallet, Inbox, Boxes, ChevronRight } from "lucide-react";
import { Badge, Card } from "@/components/admin/ui";
import RecentOrdersWidget from "@/components/admin/RecentOrdersWidget";

export const metadata = {
  title: "Dashboard | Autentik CMS",
};

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();
  const [stats, recentOrders, recentMessages] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(5),
    getRecentMessages(4),
  ]);

  const statCards = [
    {
      label: "Pesanan Belum Selesai",
      value: String(stats.pendingOrders),
      icon: ShoppingBag,
      tone: "text-[#0EA5A0] bg-[#0EA5A0]/10",
      href: "/admin/orders",
    },
    {
      label: "Pendapatan Bulan Ini",
      value: fmtRp(stats.revenueThisMonth),
      icon: Wallet,
      tone: "text-emerald-600 bg-emerald-500/10",
      href: "/admin/orders",
    },
    {
      label: "Pesan Belum Dibaca",
      value: String(stats.unreadMessages),
      icon: Inbox,
      tone: "text-sky-600 bg-sky-500/10",
      href: "/admin/inquiry",
    },
    {
      label: "Stok Menipis",
      value: String(stats.lowStockCount),
      icon: Boxes,
      tone: "text-amber-600 bg-amber-500/10",
      href: "/admin/stok",
    },
  ];

  return (
    <div className="max-w-6xl space-y-8">
      <header className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Selamat datang{admin?.fullName ? `, ${admin.fullName}` : ""}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ringkasan aktivitas toko dan inquiry PT Autentik Karya Analitika.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                  <Icon size={19} />
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 dark:text-slate-600 group-hover:text-[#0EA5A0] group-hover:translate-x-0.5 transition-all"
                />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RecentOrdersWidget orders={recentOrders} />

        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pesan Masuk Terbaru</h2>
            <Link href="/admin/inquiry" className="text-xs font-semibold text-[#0EA5A0] hover:underline">
              Lihat semua
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">Belum ada pesan masuk.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentMessages.map((msg) => (
                <li key={msg.id}>
                  <Link
                    href={`/admin/inquiry/${msg.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {msg.full_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{msg.message}</p>
                    </div>
                    <div className="shrink-0">
                      <Badge tone={msg.is_read ? "slate" : "amber"}>{msg.is_read ? "Dibaca" : "Baru"}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}