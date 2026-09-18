"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { saveZone, deleteZone, toggleZone, saveRate, deleteRate } from "@/lib/actions/shipping";
import type { ShippingZoneWithRates } from "@/lib/admin-data";
import { Card, Badge, FieldError, formatRupiah, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

interface RateValues {
  weightFromG: string;
  weightToG: string;
  cost: string;
}

interface RateDraft extends RateValues {
  key: string;
}

export default function ShippingRatesManager({ zones }: { zones: ShippingZoneWithRates[] }) {
  const [showNew, setShowNew] = useState(false);
  const activeZones = zones.filter((z) => z.is_active).length;

  return (
    <Card className="mt-6">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#0EA5A0]" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Tarif Ongkir</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zona wilayah terstruktur × rentang berat inklusif (gram).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
        >
          <Plus size={16} />
          Zona Baru
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={activeZones >= 2 ? "green" : "amber"}>{activeZones} zona aktif</Badge>
          {activeZones <= 1 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={13} />
              {activeZones === 0
                ? "Belum ada zona aktif — checkout Marketplace Komponen tidak dapat menghitung ongkir."
                : "Pastikan seluruh wilayah tujuan memiliki mapping region dan tarif aktif."}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Ongkir hanya tersedia bila <span className="font-semibold">Pengiriman diaktifkan</span>, alamat cocok
          dengan mapping region, dan berat masuk tepat satu rentang tarif. Mapping region dikelola melalui schema
          terstruktur; editor wilayah lengkap akan tersedia pada Task 8D.
        </p>

        {zones.length === 0 && !showNew && (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Belum ada zona pengiriman. Klik &quot;Zona Baru&quot; untuk menambahkan.
          </div>
        )}

        {zones.map((zone) => (
          <ZoneCard key={zone.id} zone={zone} />
        ))}

        {showNew && <ZoneCard zone={null} onDone={() => setShowNew(false)} />}
      </div>
    </Card>
  );
}

function ZoneCard({ zone, onDone }: { zone: ShippingZoneWithRates | null; onDone?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const isNew = !zone;

  const [name, setName] = useState(zone?.name ?? "");
  const [sortOrder, setSortOrder] = useState(zone ? String(zone.sort_order) : "0");
  const [isActive, setIsActive] = useState(zone?.is_active ?? true);
  const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({});
  const [savingZone, setSavingZone] = useState(false);
  const [busyZoneAction, setBusyZoneAction] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RateDraft[]>([]);

  const refresh = () => router.refresh();

  const handleSaveZone = async () => {
    setSavingZone(true);
    setZoneErrors({});
    const result = await saveZone({ id: zone?.id, name, sortOrder, isActive });
    setSavingZone(false);
    if (!result.success) {
      setZoneErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    refresh();
    onDone?.();
  };

  const handleToggle = async () => {
    if (!zone) return;
    setBusyZoneAction("toggle");
    const result = await toggleZone(zone.id, !zone.is_active);
    setBusyZoneAction(null);
    if (!result.success) {
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    refresh();
  };

  const handleDeleteZone = async () => {
    if (!zone) return;
    if (!window.confirm("Hapus zona \"" + zone.name + "\" beserta semua tarifnya?")) return;
    setBusyZoneAction("delete");
    const result = await deleteZone(zone.id);
    setBusyZoneAction(null);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) refresh();
  };

  const removeDraft = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {isNew ? "Zona Baru" : zone.name}
          </span>
          {!isNew && (
            <Badge tone={zone.is_active ? "green" : "slate"}>{zone.is_active ? "Aktif" : "Nonaktif"}</Badge>
          )}
        </div>
        {!isNew && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleToggle}
              disabled={busyZoneAction !== null}
              className="text-xs font-semibold text-[#0EA5A0] hover:underline disabled:opacity-50"
            >
              {busyZoneAction === "toggle" ? "..." : zone.is_active ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button
              type="button"
              onClick={handleDeleteZone}
              disabled={busyZoneAction !== null}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
            >
              <Trash2 size={13} />
              Hapus
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nama Zona</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jawa Tengah & Yogyakarta" />
            <FieldError message={zoneErrors.name} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Urutan</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={isActive ? "1" : "0"}
                onChange={(e) => setIsActive(e.target.value === "1")}
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveZone}
            disabled={savingZone}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
          >
            {savingZone ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan Zona
          </button>
          {isNew && onDone && (
            <button
              type="button"
              onClick={onDone}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
          )}
        </div>

        {!isNew && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Daftar Tarif</p>
              <button
                type="button"
                onClick={() =>
                  setDrafts((ds) => [
                    ...ds,
                    { key: crypto.randomUUID(), weightFromG: "", weightToG: "", cost: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5A0] hover:underline"
              >
                <Plus size={13} />
                Tambah Tarif
              </button>
            </div>

            {(zone.rates.length > 0 || drafts.length > 0) ? (
              <div className="space-y-2">
                {zone.rates.map((rate) => (
                  <RateRow
                    key={rate.id}
                    zoneId={zone.id}
                    rateId={rate.id}
                    initial={{
                      weightFromG: String(rate.weight_from_g),
                      weightToG: String(rate.weight_to_g),
                      cost: String(rate.cost),
                    }}
                    onSaved={refresh}
                  />
                ))}
                {drafts.map((draft) => (
                  <RateRow
                    key={draft.key}
                    zoneId={zone.id}
                    initial={draft}
                    onSaved={() => removeDraft(draft.key)}
                    onCancel={() => removeDraft(draft.key)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">Belum ada tarif untuk zona ini. Tambahkan rentang berat pertama.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RateRow({
  zoneId,
  rateId,
  initial,
  onSaved,
  onCancel,
}: {
  zoneId: string;
  rateId?: string;
  initial: RateValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const isNew = !rateId;
  const [weightFromG, setWeightFromG] = useState(initial.weightFromG);
  const [weightToG, setWeightToG] = useState(initial.weightToG);
  const [cost, setCost] = useState(initial.cost);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveRate({ id: rateId, zoneId, weightFromG, weightToG, cost });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    onSaved?.();
  };

  const handleDelete = async () => {
    if (!rateId) {
      onCancel?.();
      return;
    }
    if (!window.confirm("Hapus tarif ini?")) return;
    setBusy(true);
    const result = await deleteRate(rateId);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) onSaved?.();
  };

  const showPreview =
    weightToG !== "" && cost !== "" && Number(weightFromG) >= 0 && Number(weightToG) >= Number(weightFromG) && Number(cost) > 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
      <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
        <div>
          <label className={labelClass}>Berat dari (gram)</label>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={weightFromG}
            onChange={(e) => setWeightFromG(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelClass}>Sampai (gram)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={weightToG}
            onChange={(e) => setWeightToG(e.target.value)}
            placeholder="1000"
          />
          <FieldError message={errors.weightToG} />
        </div>
        <div>
          <label className={labelClass}>Ongkir (Rp)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="15000"
          />
          <FieldError message={errors.cost} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isNew ? "Simpan" : "Update"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-60"
          >
            <Trash2 size={13} />
            {isNew ? "Batal" : "Hapus"}
          </button>
        </div>
      </div>
      {showPreview && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Berat {formatGrams(Number(weightFromG))}–{formatGrams(Number(weightToG))} → ongkir{" "}
          <span className="font-semibold text-[#0EA5A0]">{formatRupiah(Number(cost))}</span>
        </p>
      )}
    </div>
  );
}

function formatGrams(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n) + " g";
}
