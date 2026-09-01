import { ShieldCheck, CheckCircle2, Package, Truck } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "100% Original" },
  { icon: CheckCircle2, label: "Garansi Toko" },
  { icon: Package, label: "Ready Stock" },
  { icon: Truck, label: "Pengiriman Cepat" },
];

export default function StoreTrustStrip() {
  return (
    <div className="border-y overflow-x-auto thin-scrollbar" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4 py-2 min-w-max">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <item.icon size={13} className="text-[#0EA5A0] flex-shrink-0" />
            <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
