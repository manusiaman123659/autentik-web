"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  Trash2,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Scale,
  Building2,
  Play,
  RotateCw,
} from "lucide-react";
import {
  saveZone,
  deleteZone,
  toggleZone,
  saveRegion,
  deleteRegion,
  toggleRegion,
  saveRate,
  deleteRate,
  toggleRate,
  runTestShippingRate,
  type TestShippingRateResult,
} from "@/lib/actions/shipping";
import type {
  ShippingAdminData,
  ShippingZoneWithDetails,
  ShippingZoneRegionRow,
  ShippingRateRow,
} from "@/lib/admin-data";
import { detectRateGaps, formatGrams } from "@/lib/shipping-utils";
import { Card, Badge, FieldError, formatRupiah, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

interface Props {
  initialData: ShippingAdminData;
  enableShipping: boolean;
}

export default function ShippingRatesManager({ initialData, enableShipping }: Props) {
  const router = useRouter();
  const [showNewZone, setShowNewZone] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    initialData.zones.length > 0 ? initialData.zones[0].id : null
  );

  const zones = initialData.zones;
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? zones[0] ?? null;

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Preflight Diagnostics */}
      <PreflightDiagnostics
        shippingCoreReady={initialData.shippingCoreReady}
        testRateRpcReady={initialData.testRateRpcReady}
        enableShipping={enableShipping}
        zones={zones}
        unweightedProductsCount={initialData.unweightedProductsCount}
      />

      {/* 2. Main Shipping Zones & Detail Manager */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#0EA5A0]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Zona & Wilayah Pengiriman</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur zona wilayah tujuan, pemetaan provinsi/kota terstruktur, dan band tarif berat inklusif.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewZone((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            <Plus size={15} />
            Zona Baru
          </button>
        </div>

        <div className="p-5 space-y-6">
          {showNewZone && (
            <div className="p-4 rounded-xl border border-[#0EA5A0]/40 bg-[#0EA5A0]/5 dark:bg-[#0EA5A0]/10 mb-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Buat Zona Pengiriman Baru</h3>
              <ZoneForm
                zone={null}
                onDone={() => {
                  setShowNewZone(false);
                  router.refresh();
                }}
              />
            </div>
          )}

          {zones.length === 0 && !showNewZone ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada zona pengiriman. Klik &quot;Zona Baru&quot; untuk menambahkan zona pertama.
            </div>
          ) : (
            <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
              {/* Left Column: Zone List Navigation */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Daftar Zona</p>
                <div className="space-y-1.5">
                  {zones.map((z) => {
                    const isSelected = z.id === selectedZone?.id;
                    const regionCount = z.regions.length;
                    const rateCount = z.rates.length;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelectedZoneId(z.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? "border-[#0EA5A0] bg-[#0EA5A0]/5 dark:bg-[#0EA5A0]/10 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{z.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {initialData.shippingCoreReady ? `${regionCount} wilayah • ` : ""}
                            {rateCount} tarif
                          </p>
                        </div>
                        <Badge tone={z.is_active ? "green" : "slate"}>
                          {z.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Zone Content */}
              {selectedZone ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 space-y-6">
                  {/* Zone Header & Controls */}
                  <ZoneHeader zone={selectedZone} />

                  {/* Regions Section */}
                  <ZoneRegionsSection
                    zone={selectedZone}
                    shippingCoreReady={initialData.shippingCoreReady}
                  />

                  {/* Rates Section */}
                  <ZoneRatesSection
                    zone={selectedZone}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {/* 3. Uji Tarif Sandbox (Staff Only) */}
      <RateTestingCard rpcReady={initialData.testRateRpcReady} />
    </div>
  );
}

// =============================================================================
// 1. PREFLIGHT DIAGNOSTICS COMPONENT
// =============================================================================

function PreflightDiagnostics({
  shippingCoreReady,
  testRateRpcReady,
  enableShipping,
  zones,
  unweightedProductsCount,
}: {
  shippingCoreReady: boolean;
  testRateRpcReady: boolean;
  enableShipping: boolean;
  zones: ShippingZoneWithDetails[];
  unweightedProductsCount: number;
}) {
  const activeZones = zones.filter((z) => z.is_active);
  const activeZonesNoRegions = shippingCoreReady
    ? activeZones.filter((z) => z.regions.filter((r) => r.is_active).length === 0)
    : [];
  const activeZonesNoRates = activeZones.filter((z) => z.rates.filter((r) => r.is_active !== false).length === 0);

  const zonesWithGaps = activeZones
    .map((z) => ({ zone: z, gaps: detectRateGaps(z.rates) }))
    .filter((item) => item.gaps.length > 0);

  return (
    <Card className="p-5 border-l-4 border-l-[#0EA5A0]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-[#0EA5A0]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status Konfigurasi Pengiriman</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={shippingCoreReady ? "green" : "amber"}>
            {shippingCoreReady ? "Shipping Safety Core Aktif" : "Shipping Safety Core Belum Diterapkan"}
          </Badge>
          <Badge tone={testRateRpcReady ? "green" : "amber"}>
            {testRateRpcReady ? "Uji Tarif Admin Aktif" : "Uji Tarif Admin Belum Aktif"}
          </Badge>
          <Badge tone={enableShipping ? "green" : "amber"}>
            {enableShipping ? "Pengiriman Aktif" : "Pengiriman Nonaktif"}
          </Badge>
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Schema Status Notice */}
        {!shippingCoreReady && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Shipping Safety Core belum aktif pada database.</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                Pembaruan skema Shipping Safety perlu diterapkan sebelum penambahan Region terstruktur dan fitur Uji Tarif dapat digunakan secara runtime. Konfigurasi zona dan tarif dasar tetap aman ditampilkan.
              </p>
            </div>
          </div>
        )}

        {/* Master Switch Notice */}
        {!enableShipping ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Pengiriman sedang dinonaktifkan di Pengaturan Toko.</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                Customer tidak dapat menyelesaikan checkout sampai modul pengiriman diaktifkan dan konfigurasi tarif valid.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Master Switch: <strong>Pengiriman diaktifkan</strong> ({activeZones.length} dari {zones.length} zona aktif).</span>
          </div>
        )}

        {/* Missing Region Warning */}
        {shippingCoreReady && activeZonesNoRegions.length > 0 && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <span>
              Zona aktif belum memiliki wilayah (region) aktif:{" "}
              <strong>{activeZonesNoRegions.map((z) => z.name).join(", ")}</strong>. Alamat pembeli tidak akan dapat dicocokkan ke zona ini.
            </span>
          </div>
        )}

        {/* Missing Rate Warning */}
        {activeZonesNoRates.length > 0 && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <span>
              Zona aktif belum memiliki tarif aktif:{" "}
              <strong>{activeZonesNoRates.map((z) => z.name).join(", ")}</strong>.
            </span>
          </div>
        )}

        {/* Rate Gap Warning */}
        {zonesWithGaps.length > 0 && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <span>Terdapat celah rentang berat (gap) pada zona aktif:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                {zonesWithGaps.map((item) => (
                  <li key={item.zone.id}>
                    <strong>{item.zone.name}</strong>: belum ada tarif untuk{" "}
                    {item.gaps.map((g) => `${formatGrams(g.fromG)}–${formatGrams(g.toG)}`).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Unweighted Store Products Notice */}
        {unweightedProductsCount > 0 && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <span>
              Terdapat <strong>{unweightedProductsCount} produk Store aktif</strong> yang belum memiliki berat valid (&gt; 0 gram). Setiap keranjang yang memuat produk ini akan gagal checkout.
            </span>
          </div>
        )}

        {activeZones.length > 0 &&
          activeZonesNoRegions.length === 0 &&
          activeZonesNoRates.length === 0 &&
          zonesWithGaps.length === 0 &&
          unweightedProductsCount === 0 && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={14} />
              <span>Semua zona aktif memiliki wilayah, rentang tarif lengkap tanpa celah, dan seluruh produk berbobot valid.</span>
            </div>
          )}
      </div>
    </Card>
  );
}

// =============================================================================
// 2. ZONE HEADER & FORM
// =============================================================================

function ZoneHeader({ zone }: { zone: ShippingZoneWithDetails }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleToggle = async () => {
    setBusyAction("toggle");
    const result = await toggleZone(zone.id, !zone.is_active);
    setBusyAction(null);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus zona "${zone.name}"? Jika zona ini sudah digunakan oleh pesanan riil, penghapusan akan ditolak demi keamanan data.`)) {
      return;
    }
    setBusyAction("delete");
    const result = await deleteZone(zone.id);
    setBusyAction(null);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  if (editing) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Edit Nama & Status Zona</h4>
        <ZoneForm
          zone={zone}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{zone.name}</h3>
          <Badge tone={zone.is_active ? "green" : "slate"}>
            {zone.is_active ? "Zona Aktif" : "Zona Nonaktif"}
          </Badge>
          <span className="text-xs text-slate-400">Urutan: {zone.sort_order}</span>
        </div>

        {/* Legacy Reference notice if present */}
        {(zone.provinces.length > 0 || zone.cities.length > 0) && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Data referensi lama: Provinsi [{zone.provinces.join(", ") || "-"}] • Kota [{zone.cities.join(", ") || "-"}]
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Edit Zona
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busyAction !== null}
          className="px-3 py-1.5 rounded-lg border border-[#0EA5A0] text-xs font-semibold text-[#0EA5A0] hover:bg-[#0EA5A0]/10 transition-colors disabled:opacity-50"
        >
          {busyAction === "toggle" ? "..." : zone.is_active ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busyAction !== null}
          title="Hapus zona draft (ditolak bila telah ada transaksi)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function ZoneForm({
  zone,
  onDone,
}: {
  zone: ShippingZoneWithDetails | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(zone?.name ?? "");
  const [sortOrder, setSortOrder] = useState(zone ? String(zone.sort_order) : "0");
  const [isActive, setIsActive] = useState(zone?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    const res = await saveZone({ id: zone?.id, name, sortOrder, isActive });
    setSaving(false);
    if (!res.success) {
      setErrors(res.errors ?? {});
      toast("error", res.message);
      return;
    }
    toast("success", res.message);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nama Zona</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Jawa Tengah & DIY"
          />
          <FieldError message={errors.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Urutan Prioritas</label>
            <input
              type="number"
              min={0}
              className={inputClass}
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
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Simpan Zona
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 3. REGIONS SECTION (shipping_zone_regions)
// =============================================================================

function ZoneRegionsSection({
  zone,
  shippingCoreReady,
}: {
  zone: ShippingZoneWithDetails;
  shippingCoreReady: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 size={16} className="text-[#0EA5A0]" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Wilayah Terpetakan ({zone.regions.length})
          </h4>
        </div>
        {shippingCoreReady && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5A0] hover:underline"
          >
            <Plus size={13} />
            Tambah Wilayah
          </button>
        )}
      </div>

      {!shippingCoreReady ? (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800">
          Tabel wilayah terstruktur (`shipping_zone_regions`) belum tersedia di live database. Editor wilayah akan aktif setelah pembaruan skema diterapkan.
        </div>
      ) : (
        <>
          {showAdd && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <RegionForm
                zoneId={zone.id}
                onDone={() => {
                  setShowAdd(false);
                  router.refresh();
                }}
              />
            </div>
          )}

          {zone.regions.length === 0 && !showAdd ? (
            <p className="text-xs text-slate-400 italic py-2">
              Belum ada wilayah yang dipetakan ke zona ini. Klik &quot;Tambah Wilayah&quot; untuk menambahkan provinsi atau kota.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {zone.regions.map((reg) => (
                <RegionRow key={reg.id} region={reg} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RegionRow({ region }: { region: ShippingZoneRegionRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    const res = await toggleRegion(region.id, !region.is_active);
    setBusy(false);
    toast(res.success ? "success" : "error", res.message);
    if (res.success) router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus wilayah "${region.city ? `${region.city}, ${region.province}` : region.province}" dari zona ini?`)) {
      return;
    }
    setBusy(true);
    const res = await deleteRegion(region.id);
    setBusy(false);
    toast(res.success ? "success" : "error", res.message);
    if (res.success) router.refresh();
  };

  const isProvinceWide = !region.city;

  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {isProvinceWide ? region.province : `${region.city}, ${region.province}`}
          </span>
          <Badge tone={isProvinceWide ? "cyan" : "violet"}>
            {isProvinceWide ? "Seluruh Provinsi" : "Kota Khusus"}
          </Badge>
          {!region.is_active && <Badge tone="slate">Nonaktif</Badge>}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {isProvinceWide
            ? "Mencakup semua kota/kabupaten di provinsi ini (kecuali yang di-override kota khusus)"
            : "Prioritas tinggi: mencocokkan kota/kabupaten secara spesifik"}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className="text-xs font-semibold text-[#0EA5A0] hover:underline px-2 py-1 disabled:opacity-50"
        >
          {region.is_active ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function RegionForm({
  zoneId,
  onDone,
}: {
  zoneId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [isProvinceWide, setIsProvinceWide] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    const res = await saveRegion({
      zoneId,
      isProvinceWide,
      province,
      city: isProvinceWide ? null : city,
      isActive: true,
    });
    setSaving(false);
    if (!res.success) {
      setErrors(res.errors ?? {});
      toast("error", res.message);
      return;
    }
    toast("success", res.message);
    onDone();
  };

  return (
    <div className="space-y-3">
      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Tambah Wilayah Baru</h5>

      {/* Scope Selector */}
      <div className="flex gap-4 items-center text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name="regionScope"
            checked={!isProvinceWide}
            onChange={() => setIsProvinceWide(false)}
            className="text-[#0EA5A0]"
          />
          Kota / Kabupaten Tertentu
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            name="regionScope"
            checked={isProvinceWide}
            onChange={() => setIsProvinceWide(true)}
            className="text-[#0EA5A0]"
          />
          Seluruh Provinsi (Fallback)
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nama Provinsi</label>
          <input
            className={inputClass}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Contoh: Jawa Tengah"
          />
          <FieldError message={errors.province} />
        </div>
        <div>
          <label className={labelClass}>
            Nama Kota / Kabupaten {!isProvinceWide && <span className="text-red-500">*</span>}
          </label>
          <input
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={isProvinceWide}
            placeholder={isProvinceWide ? "(Berlaku untuk seluruh kota)" : "Contoh: Semarang"}
          />
          <FieldError message={errors.city} />
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Pencocokan nama tidak membedakan huruf besar/kecil (case-insensitive). Gunakan nama baku sesuai alamat yang sering diisi customer.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Simpan Wilayah
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 4. RATES SECTION (shipping_rates)
// =============================================================================

function ZoneRatesSection({
  zone,
}: {
  zone: ShippingZoneWithDetails;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const gaps = detectRateGaps(zone.rates);

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scale size={16} className="text-[#0EA5A0]" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Rentang Berat & Tarif ({zone.rates.length})
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5A0] hover:underline"
        >
          <Plus size={13} />
          Tambah Tarif
        </button>
      </div>

      {/* Gap Warning Banner for this zone */}
      {gaps.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Terdapat celah rentang berat (gap) pada zona ini:</p>
            <p className="text-[11px] opacity-90 mt-0.5">
              Rentang yang belum memiliki tarif:{" "}
              <strong>{gaps.map((g) => `${formatGrams(g.fromG)}–${formatGrams(g.toG)}`).join(", ")}</strong>.
              Pesanan dengan bobot dalam rentang tersebut tidak dapat divalidasi ongkirnya.
            </p>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
          <RateForm
            zoneId={zone.id}
            rate={null}
            onDone={() => {
              setShowAdd(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {zone.rates.length === 0 && !showAdd ? (
        <p className="text-xs text-slate-400 italic py-2">
          Belum ada tarif berat untuk zona ini. Klik &quot;Tambah Tarif&quot; untuk menambahkan band pertama (misal: 0–1.000 g).
        </p>
      ) : (
        <div className="space-y-2">
          {zone.rates.map((rate) => (
            <RateRowItem key={rate.id} zoneId={zone.id} rate={rate} />
          ))}
        </div>
      )}
    </div>
  );
}

function RateRowItem({ zoneId, rate }: { zoneId: string; rate: ShippingRateRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    const res = await toggleRate(rate.id, rate.is_active === false);
    setBusy(false);
    toast(res.success ? "success" : "error", res.message);
    if (res.success) router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus tarif ${formatGrams(rate.weight_from_g)}–${formatGrams(rate.weight_to_g)}?`)) {
      return;
    }
    setBusy(true);
    const res = await deleteRate(rate.id);
    setBusy(false);
    toast(res.success ? "success" : "error", res.message);
    if (res.success) router.refresh();
  };

  if (editing) {
    return (
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <RateForm
          zoneId={zoneId}
          rate={rate}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  const isActive = rate.is_active !== false;

  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {formatGrams(rate.weight_from_g)} – {formatGrams(rate.weight_to_g)}
          </p>
          <p className="text-xs font-semibold text-[#0EA5A0] mt-0.5">
            {formatRupiah(rate.cost)}
          </p>
        </div>
        <Badge tone={isActive ? "green" : "slate"}>
          {isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className="text-xs font-semibold text-[#0EA5A0] hover:underline disabled:opacity-50"
        >
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function RateForm({
  zoneId,
  rate,
  onDone,
}: {
  zoneId: string;
  rate: ShippingRateRow | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [weightFromG, setWeightFromG] = useState(rate ? String(rate.weight_from_g) : "");
  const [weightToG, setWeightToG] = useState(rate ? String(rate.weight_to_g) : "");
  const [cost, setCost] = useState(rate ? String(rate.cost) : "");
  const [isActive, setIsActive] = useState(rate ? rate.is_active !== false : true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    const res = await saveRate({
      id: rate?.id,
      zoneId,
      weightFromG,
      weightToG,
      cost,
      isActive,
    });
    setSaving(false);
    if (!res.success) {
      setErrors(res.errors ?? {});
      toast("error", res.message);
      return;
    }
    toast("success", res.message);
    onDone();
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Berat Dari (gram)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={weightFromG}
            onChange={(e) => setWeightFromG(e.target.value)}
            placeholder="0"
          />
          <FieldError message={errors.weightFromG} />
        </div>
        <div>
          <label className={labelClass}>Sampai (gram)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={weightToG}
            onChange={(e) => setWeightToG(e.target.value)}
            placeholder="1000"
          />
          <FieldError message={errors.weightToG} />
        </div>
        <div>
          <label className={labelClass}>Ongkir (Rp)</label>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="15000"
          />
          <FieldError message={errors.cost} />
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

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {rate ? "Update Tarif" : "Simpan Tarif"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 5. RATE TESTING SANDBOX (Uji Tarif)
// =============================================================================

function RateTestingCard({
  rpcReady,
}: {
  rpcReady: boolean;
}) {
  const { toast } = useToast();
  const [province, setProvince] = useState("Jawa Tengah");
  const [city, setCity] = useState("Semarang");
  const [weightGrams, setWeightGrams] = useState("850");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestShippingRateResult | null>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpcReady) {
      toast("error", "Fitur Uji Tarif belum aktif pada database. Pembaruan Shipping Admin 0047 belum diterapkan.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    const res = await runTestShippingRate({ province, city, weightGrams });
    setTesting(false);
    setTestResult(res);
    if (!res.success) {
      toast("error", res.message || "Gagal menguji tarif.");
    }
  };

  const quote = testResult?.quote;
  const isQuoted = quote?.status === "QUOTED";

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <Play size={16} className="text-[#0EA5A0]" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Uji Tarif Pengiriman</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Simulasikan pencocokan wilayah dan tarif berat dengan engine SQL yang sama persis seperti saat checkout.
      </p>

      {!rpcReady && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 text-xs mb-4">
          <AlertTriangle size={14} className="inline mr-1 text-amber-600" />
          Fitur Uji Tarif belum aktif pada database. Pembaruan Shipping Admin 0047 belum diterapkan.
        </div>
      )}

      <form onSubmit={handleTest} className="grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className={labelClass}>Provinsi</label>
          <input
            className={inputClass}
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Jawa Tengah"
            disabled={!rpcReady}
          />
        </div>
        <div>
          <label className={labelClass}>Kota / Kabupaten</label>
          <input
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Semarang"
            disabled={!rpcReady}
          />
        </div>
        <div>
          <label className={labelClass}>Berat Total (gram)</label>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            placeholder="850"
            disabled={!rpcReady}
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={testing || !rpcReady}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-xs font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
            Uji Tarif
          </button>
        </div>
      </form>

      {/* Test Result Display */}
      {testResult && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {testResult.success && quote ? (
            <div
              className={`p-4 rounded-xl border ${
                isQuoted
                  ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge tone={isQuoted ? "green" : "amber"}>
                    {isQuoted ? "Tarif Cocok (QUOTED)" : "Pengiriman Tidak Tersedia"}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alasan: {quote.reasonCode}
                  </span>
                </div>
                {quote.cost != null && (
                  <span className="text-sm font-bold text-[#0EA5A0]">
                    {formatRupiah(quote.cost)}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
                <div>
                  <span className="text-slate-400">Zona Cocok:</span>{" "}
                  <strong className="text-slate-900 dark:text-white">{quote.zoneName ?? "-"}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Band Tarif:</span>{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {quote.weightFromG != null && quote.weightToG != null
                      ? `${formatGrams(quote.weightFromG)} – ${formatGrams(quote.weightToG)}`
                      : "-"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Berat:</span>{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {quote.totalWeightG != null ? formatGrams(quote.totalWeightG) : "-"}
                  </strong>
                </div>
              </div>

              {/* Notice if Store shipping master switch is disabled */}
              {quote.storeShippingEnabled === false && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-1.5">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-700" />
                  <span>
                    <strong>Peringatan Diagnostik:</strong> Tarif wilayah dan berat ini berhasil dicocokkan, namun modul pengiriman saat ini <strong>dinonaktifkan</strong> di Pengaturan Toko. Customer tidak dapat checkout dengan ongkir ini sampai modul pengiriman diaktifkan.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800/40">
              {testResult.message || "Gagal mendapatkan hasil uji tarif."}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
