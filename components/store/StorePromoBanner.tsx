import Link from "next/link";
import { MessageCircle, Truck, ShieldCheck } from "lucide-react";

export default function StorePromoBanner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {/* Main banner */}
      <Link
        href="/store"
        className="sm:col-span-2 flex items-center gap-3 rounded-sm border p-3 transition-opacity hover:opacity-90"
        style={{ borderColor: "var(--border-subtle)", backgroundColor: "#0B1F3A" }}
      >
        <div className="w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 bg-[#0EA5A0]/15">
          <ShieldCheck size={18} className="text-[#0EA5A0]" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Sparepart Original Garansi Resmi</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Tersedia untuk unit Talpha, Cylab, Ullun, dan Epal</p>
        </div>
      </Link>

      {/* Side banners stacked */}
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-2.5 rounded-sm border p-2.5"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-card)" }}
        >
          <Truck size={15} className="text-[#0EA5A0] flex-shrink-0" />
          <div>
            <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>Pengiriman Aman</p>
            <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}> packing kayu & bubble wrap</p>
          </div>
        </div>
        <div
          className="flex items-center gap-2.5 rounded-sm border p-2.5"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-card)" }}
        >
          <MessageCircle size={15} className="text-[#0EA5A0] flex-shrink-0" />
          <div>
            <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>Konsultasi Gratis</p>
            <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}> Chat WhatsApp tim kami</p>
          </div>
        </div>
      </div>
    </div>
  );
}
