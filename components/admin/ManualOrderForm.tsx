"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createManualOrder } from "@/lib/actions/store";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

interface ManualOrderFormProps {
  products: { id: string; name: string; price: number | null; stock: number | null }[];
}

export default function ManualOrderForm({ products }: ManualOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cod" | "midtrans">("transfer");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id ?? "", quantity: 1 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setItem = (index: number, key: "productId" | "quantity", value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await createManualOrder({
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      province,
      postalCode,
      notes,
      paymentMethod,
      items,
    });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    router.push("/admin/orders");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Data Pembeli</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Nama Pembeli</label>
            <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <FieldError message={errors.customerName} />
          </div>
          <div>
            <label className={labelClass}>Email (opsional)</label>
            <input className={inputClass} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            <FieldError message={errors.customerEmail} />
          </div>
          <div>
            <label className={labelClass}>No. Telepon</label>
            <input className={inputClass} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <FieldError message={errors.customerPhone} />
          </div>
          <div>
            <label className={labelClass}>Metode Pembayaran</label>
            <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "transfer" | "cod" | "midtrans")}>
              <option value="transfer">Transfer Bank</option>
              <option value="cod">COD</option>
              <option value="midtrans">Midtrans</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Alamat Lengkap</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <FieldError message={errors.address} />
          </div>
          <div>
            <label className={labelClass}>Kota</label>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
            <FieldError message={errors.city} />
          </div>
          <div>
            <label className={labelClass}>Provinsi</label>
            <input className={inputClass} value={province} onChange={(e) => setProvince(e.target.value)} />
            <FieldError message={errors.province} />
          </div>
          <div>
            <label className={labelClass}>Kode Pos (opsional)</label>
            <input className={inputClass} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Catatan (opsional)</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Item Pesanan</h2>
          <button
            type="button"
            onClick={() => setItems([...items, { productId: products[0]?.id ?? "", quantity: 1 }])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
          >
            <Plus size={14} />
            Tambah Item
          </button>
        </div>
        {errors.items && <FieldError message={errors.items} />}
        <div className="space-y-3">
          {items.map((item, i) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <div key={i} className="grid sm:grid-cols-[1fr_110px_auto] gap-3 items-end">
                <div>
                  <label className={labelClass}>Produk</label>
                  <select
                    className={inputClass}
                    value={item.productId}
                    onChange={(e) => setItem(i, "productId", e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.price != null ? p.price.toLocaleString("id-ID") : "0"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Jumlah</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={item.quantity}
                    onChange={(e) => setItem(i, "quantity", Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, x) => x !== i))}
                  disabled={items.length === 1}
                  className="h-[42px] w-10 flex items-center justify-center text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  aria-label="Hapus item"
                >
                  <Trash2 size={16} />
                </button>
                {product && (
                  <p className="sm:col-span-3 -mt-2 text-xs text-slate-400">
                    Stok tersedia: {product.stock ?? 0} pcs
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-10">
        <button
          type="button"
          onClick={() => router.push("/admin/orders")}
          className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Buat Pesanan
        </button>
      </div>
    </div>
  );
}