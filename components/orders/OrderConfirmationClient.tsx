"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Package,
  Landmark,
  MessageCircle,
  ChevronRight,
  Search,
} from "lucide-react";
import { orderSnapshotKey, type OrderSnapshot } from "@/lib/order-snapshot";
import { formatRupiah } from "@/lib/format";

// TODO(store): ganti dengan informasi rekening resmi perusahaan ketika sudah ditentukan.
const BANK_INFO = {
  bank: "Bank Contoh",
  accountName: "PT Autentik Karya Analitika",
  accountNumber: "0000-0000-0000",
};

function readSnapshot(code: string): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(orderSnapshotKey(code));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const s = parsed as OrderSnapshot;
    if (typeof s.code !== "string" || !Array.isArray(s.items)) return null;
    return s;
  } catch {
    return null;
  }
}

export default function OrderConfirmationClient({ code }: { code: string }) {
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(readSnapshot(code));
    setMounted(true);
  }, [code]);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center py-16 px-6 rounded-2xl border shadow-sm max-w-md w-full" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Detail pesanan tidak ditemukan
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
            Detail pesanan untuk kode <span className="font-mono font-semibold">{code}</span> hanya tersedia di
            sesi browser tempat Anda menyelesaikan checkout. Jika ini pesanan Anda, silakan hubungi tim kami.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
            >
              Kembali ke Store
              <ChevronRight size={16} />
            </Link>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "#25D366", color: "#fff" }}
            >
              <MessageCircle size={16} />
              Hubungi Kami
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Pesanan Berhasil Dibuat
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Terima kasih, pesanan Anda telah kami terima dan akan segera diproses.
          </p>
          <div className="inline-flex items-center gap-3 mt-5 px-5 py-2.5 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Kode Pesanan
            </span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              {snapshot.code}
            </span>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
              Menunggu Pembayaran
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Daftar item */}
        <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Detail Pesanan</h2>
          <div className="space-y-4">
            {snapshot.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} width={64} height={64} className="object-contain w-full h-full p-1.5" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/store/${item.slug}`} className="text-sm font-bold hover:text-[#0EA5A0] transition-colors line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </Link>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {item.brand} · {item.quantity} × {formatRupiah(item.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t mt-5 pt-5 space-y-2.5 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(snapshot.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Ongkos kirim</span>
              <span className="text-xs font-light">Dihitung saat konfirmasi</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
              <span className="text-lg font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(snapshot.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Instruksi pembayaran */}
        <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Landmark size={18} className="text-[#0EA5A0]" />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Pembayaran Transfer</h2>
          </div>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>
            Lakukan transfer manual ke rekening berikut, lalu kirim bukti transfer. Status pesanan akan
            diperbarui oleh tim kami setelah pembayaran terkonfirmasi.
          </p>
          <div className="rounded-xl border p-4 space-y-1.5 text-sm" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Bank</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{BANK_INFO.bank}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Atas Nama</span>
              <span className="font-semibold text-right" style={{ color: "var(--text-primary)" }}>{BANK_INFO.accountName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>No. Rekening</span>
              <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{BANK_INFO.accountNumber}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 font-light">
            Silakan sertakan kode pesanan <span className="font-mono font-semibold">{snapshot.code}</span> sebagai
            referensi saat transfer.
          </p>
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#25D366", color: "#fff" }}
          >
            <MessageCircle size={16} />
            Kirim Bukti via WhatsApp
          </a>
        </div>

        <div className="flex justify-center pb-8">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
          >
            Lanjut Belanja
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
