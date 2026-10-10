"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, MapPin, Network, Plus, Save, Trash2, X } from "lucide-react";
import type { DistributionEntityRow } from "@/lib/admin-data";
import {
  deleteDistributionEntity,
  saveDistributionEntity,
  toggleDistributionEntity,
} from "@/lib/actions/relasi";
import {
  DISTRIBUTION_TYPE_LABELS,
  type DistributionType,
} from "@/lib/validations/distributionSchema";
import { Badge, FieldError, TableShell, Td, Th, inputClass, labelClass } from "@/components/admin/ui";
import { SortCell, VisibleToggle } from "@/components/admin/RelasiBits";
import MediaUploadField from "@/components/admin/MediaUploadField";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import PaginationBar from "@/components/admin/PaginationBar";
import { useToast } from "@/components/admin/Toast";

const ITEMS_PER_PAGE = 8;

interface FormState {
  id: string;
  name: string;
  legalName: string;
  shortName: string;
  distributionType: DistributionType;
  parentId: string;
  marketSegment: string;
  regionLabel: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string;
  contactName: string;
  logoUrl: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: FormState = {
  id: "",
  name: "",
  legalName: "",
  shortName: "",
  distributionType: "distributor",
  parentId: "",
  marketSegment: "",
  regionLabel: "",
  city: "",
  province: "",
  address: "",
  phone: "",
  email: "",
  websiteUrl: "",
  contactName: "",
  logoUrl: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

function rowToForm(entity: DistributionEntityRow): FormState {
  return {
    id: entity.id,
    name: entity.name,
    legalName: entity.legal_name ?? "",
    shortName: entity.short_name ?? "",
    distributionType: entity.distribution_type,
    parentId: entity.parent_id ?? "",
    marketSegment: entity.market_segment ?? "",
    regionLabel: entity.region_label ?? "",
    city: entity.city ?? "",
    province: entity.province ?? "",
    address: entity.address ?? "",
    phone: entity.phone ?? "",
    email: entity.email ?? "",
    websiteUrl: entity.website_url ?? "",
    contactName: entity.contact_name ?? "",
    logoUrl: entity.logo_url ?? "",
    description: entity.description ?? "",
    isActive: entity.is_active,
    sortOrder: entity.sort_order,
  };
}

function typeTone(type: DistributionType) {
  if (type === "group_distribution") return "teal";
  if (type === "sub_distributor") return "amber";
  return "blue";
}

export default function DistributionTab({ entities }: { entities: DistributionEntityRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const activeSession = useRef(0);
  const uploadBusy = useRef(false);
  const submitLock = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<DistributionEntityRow | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(entities.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = entities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]));

  const resetUpload = () => {
    activeSession.current++;
    setFormSession(activeSession.current);
    uploadBusy.current = false; setUploading(false);
  };

  const closeForm = () => { resetUpload(); setForm(null); setErrors({}); };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || uploadBusy.current || submitLock.current) return;
    const session = activeSession.current;
    submitLock.current = true;
    setBusy(true);
    setErrors({});
    try {
      const result = await saveDistributionEntity(form);
      if (session !== activeSession.current) return;
      if (!result.success) {
        setErrors(result.errors ?? {}); toast("error", result.message); return;
      }
      toast("success", result.message); closeForm(); router.refresh();
    } catch {
      if (session === activeSession.current) toast("error", "Gagal menyimpan jaringan distribusi. Silakan coba lagi.");
    } finally {
      submitLock.current = false; setBusy(false);
    }
  };

  const handleToggle = async (entity: DistributionEntityRow) => {
    setBusy(true);
    const result = await toggleDistributionEntity(entity.id, !entity.is_active);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const commitSort = async (entity: DistributionEntityRow, next: number) => {
    if (next === entity.sort_order) return;
    setBusy(true);
    const result = await saveDistributionEntity({ ...rowToForm(entity), sortOrder: next });
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await deleteDistributionEntity(pendingDelete.id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setPendingDelete(null);
    if (result.success) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            resetUpload();
            setForm({ ...emptyForm });
            setErrors({});
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0C8C87]"
        >
          <Plus size={15} />
          Tambah Jaringan
        </button>
      </div>

      {form && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {form.id ? "Edit Jaringan Distribusi" : "Tambah Jaringan Distribusi"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Isi hanya informasi perusahaan, wilayah, dan kontak yang sudah terverifikasi.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Tutup form"
              className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nama Perusahaan *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="PT Contoh Distribusi" />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className={labelClass}>Nama Legal</label>
              <input className={inputClass} value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} placeholder="Kosongkan jika sama dengan nama" />
              <FieldError message={errors.legalName} />
            </div>
            <div>
              <label className={labelClass}>Nama Singkat</label>
              <input className={inputClass} value={form.shortName} onChange={(e) => setField("shortName", e.target.value)} placeholder="Contoh: MIKA" />
              <FieldError message={errors.shortName} />
            </div>
            <div>
              <label className={labelClass}>Tipe *</label>
              <select className={inputClass} value={form.distributionType} onChange={(e) => setField("distributionType", e.target.value as DistributionType)}>
                {Object.entries(DISTRIBUTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <FieldError message={errors.distributionType} />
            </div>
            <div>
              <label className={labelClass}>Parent Distributor</label>
              <select className={inputClass} value={form.parentId} onChange={(e) => setField("parentId", e.target.value)}>
                <option value="">Tanpa parent</option>
                {entities.filter((entity) => entity.id !== form.id).map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
              <FieldError message={errors.parentId} />
            </div>
            <div>
              <label className={labelClass}>Segmen Pasar</label>
              <input className={inputClass} value={form.marketSegment} onChange={(e) => setField("marketSegment", e.target.value)} placeholder="Isi sesuai sumber terverifikasi" />
              <FieldError message={errors.marketSegment} />
            </div>
            <div>
              <label className={labelClass}>Label Wilayah</label>
              <input className={inputClass} value={form.regionLabel} onChange={(e) => setField("regionLabel", e.target.value)} placeholder="Contoh: Jawa Tengah" />
              <FieldError message={errors.regionLabel} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Kota</label>
                <input className={inputClass} value={form.city} onChange={(e) => setField("city", e.target.value)} />
                <FieldError message={errors.city} />
              </div>
              <div>
                <label className={labelClass}>Provinsi</label>
                <input className={inputClass} value={form.province} onChange={(e) => setField("province", e.target.value)} />
                <FieldError message={errors.province} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Alamat</label>
              <textarea className={`${inputClass} min-h-20 resize-y`} value={form.address} onChange={(e) => setField("address", e.target.value)} />
              <FieldError message={errors.address} />
            </div>
            <div>
              <label className={labelClass}>Nama PIC</label>
              <input className={inputClass} value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} />
              <FieldError message={errors.contactName} />
            </div>
            <div>
              <label className={labelClass}>Telepon</label>
              <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              <FieldError message={errors.phone} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input className={inputClass} value={form.websiteUrl} onChange={(e) => setField("websiteUrl", e.target.value)} placeholder="https://example.com" />
              <FieldError message={errors.websiteUrl} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Deskripsi / Peran</label>
              <textarea className={`${inputClass} min-h-20 resize-y`} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Contoh: Marketing dan Distribusi" />
              <FieldError message={errors.description} />
            </div>
            <div className="sm:col-span-2">
              <MediaUploadField key={formSession} id="distribution-logo" label="Logo Perusahaan" value={form.logoUrl}
                pathPrefix="distribution" errorContext="Logo jaringan distribusi" disabled={busy} fieldError={errors.logoUrl}
                onChange={(url) => { if (activeSession.current === formSession) setField("logoUrl", url); }}
                onUploadingChange={(value) => {
                  if (activeSession.current !== formSession) return;
                  uploadBusy.current = value; setUploading(value);
                }} />
            </div>
            <div>
              <label className={labelClass}>Urutan</label>
              <input type="number" min={0} max={9999} className={inputClass} value={form.sortOrder} onChange={(e) => setField("sortOrder", Number(e.target.value) || 0)} />
              <FieldError message={errors.sortOrder} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} className="h-4 w-4 rounded accent-[#0EA5A0]" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif dan tampil di publik</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6">
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
            <button type="submit" disabled={busy || uploading} className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5A0] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C8C87] disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan
            </button>
          </div>
        </form>
      )}

      {entities.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Network size={24} />
          </div>
          <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Belum ada jaringan distribusi</h3>
          <p className="mx-auto max-w-md text-sm text-slate-500 dark:text-slate-400">Tambahkan data distributor yang sudah terverifikasi untuk ditampilkan di halaman publik.</p>
        </div>
      ) : (
        <TableShell>
          <thead><tr><Th>Perusahaan</Th><Th>Tipe</Th><Th>Parent / Wilayah</Th><Th>Aktif</Th><Th>Urutan</Th><Th className="text-right">Aksi</Th></tr></thead>
          <tbody>
            {pageItems.map((entity) => (
              <tr key={entity.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Td>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700">
                      {entity.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entity.logo_url} alt={entity.name} className="h-full w-full object-contain p-1" />
                      ) : <Building2 size={16} className="text-slate-300 dark:text-slate-600" />}
                    </div>
                    <div className="min-w-0"><span className="block truncate font-semibold text-slate-900 dark:text-white">{entity.name}</span><span className="text-xs text-slate-400">{entity.short_name || entity.legal_name || "Tanpa nama singkat"}</span></div>
                  </div>
                </Td>
                <Td><Badge label={DISTRIBUTION_TYPE_LABELS[entity.distribution_type]} tone={typeTone(entity.distribution_type)} /></Td>
                <Td>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {entity.parent_id && <span className="block">Parent: {entityNames.get(entity.parent_id) ?? "Tidak ditemukan"}</span>}
                    {(entity.region_label || entity.city || entity.province) ? <span className="flex items-center gap-1"><MapPin size={12} />{entity.region_label || entity.city || entity.province}</span> : <span>Belum ada wilayah</span>}
                  </div>
                </Td>
                <Td><VisibleToggle checked={entity.is_active} disabled={busy} onToggle={() => handleToggle(entity)} /></Td>
                <Td><SortCell value={entity.sort_order} disabled={busy} onCommit={(next) => commitSort(entity, next)} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <button type="button" onClick={() => { resetUpload(); setForm(rowToForm(entity)); setErrors({}); }} className="mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline">Edit</button>
                  <button type="button" onClick={() => setPendingDelete(entity)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-950/40"><Trash2 size={13} />Hapus</button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <PaginationBar totalItems={entities.length} itemsPerPage={ITEMS_PER_PAGE} page={safePage} onPageChange={setPage} noun="jaringan" />

      {pendingDelete && (
        <ConfirmDialog title={`Hapus "${pendingDelete.name}"?`} description="Data akan dihapus secara soft-delete dan tidak lagi tampil di halaman publik." onConfirm={handleDelete} onCancel={() => setPendingDelete(null)} busy={busy} />
      )}
    </div>
  );
}
