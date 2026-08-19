"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import type { GroupCompanyRow } from "@/lib/admin-data";
import {
  TableShell,
  Th,
  Td,
  inputClass,
  labelClass,
  FieldError,
} from "@/components/admin/ui";
import {
  saveGroupCompany,
  deleteGroupCompany,
  toggleGroupCompany,
} from "@/lib/actions/relasi";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MediaUploadField from "@/components/admin/MediaUploadField";
import { VisibleToggle, SortCell } from "@/components/admin/RelasiBits";
import PaginationBar from "@/components/admin/PaginationBar";

const ITEMS_PER_PAGE = 8;

interface FormState {
  id: string;
  name: string;
  legalName: string;
  logoUrl: string;
  url: string;
  isVisible: boolean;
  sortOrder: number;
}

const emptyForm: FormState = {
  id: "",
  name: "",
  legalName: "",
  logoUrl: "",
  url: "",
  isVisible: true,
  sortOrder: 0,
};

export default function GroupTab({ groups }: { groups: GroupCompanyRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GroupCompanyRow | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(groups.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = groups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const isEdit = Boolean(form?.id);

  const setField = (key: keyof FormState, value: string | boolean | number) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setErrors({});
  };

  const openEdit = (g: GroupCompanyRow) => {
    setForm({
      id: g.id,
      name: g.name,
      legalName: g.legal_name || "",
      logoUrl: g.logo_url || "",
      url: g.url || "",
      isVisible: g.is_visible,
      sortOrder: g.sort_order,
    });
    setErrors({});
  };

  const cancel = () => {
    setForm(null);
    setErrors({});
  };

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    setErrors({});
    const result = await saveGroupCompany(form);
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    setForm(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await deleteGroupCompany(pendingDelete.id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setPendingDelete(null);
    if (result.success) router.refresh();
  };

  const handleToggle = async (g: GroupCompanyRow) => {
    setBusy(true);
    const result = await toggleGroupCompany(g.id, !g.is_visible);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const commitSort = async (g: GroupCompanyRow, next: number) => {
    if (next === g.sort_order) return;
    setBusy(true);
    const result = await saveGroupCompany({
      id: g.id,
      name: g.name,
      legalName: g.legal_name || "",
      logoUrl: g.logo_url || "",
      url: g.url || "",
      isVisible: g.is_visible,
      sortOrder: next,
    });
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
        >
          <Plus size={15} />
          Tambah Grup
        </button>
      </div>

      {form && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit ? "Edit Grup Perusahaan" : "Tambah Grup Perusahaan"}
            </h3>
            <button
              type="button"
              onClick={cancel}
              aria-label="Tutup form"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Nama Grup *</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="MIKA"
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className={labelClass}>Nama Legal</label>
              <input
                className={inputClass}
                value={form.legalName}
                onChange={(e) => setField("legalName", e.target.value)}
                placeholder="PT Mitra Karya Analitika"
              />
              <FieldError message={errors.legalName} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>URL Website</label>
              <input
                className={inputClass}
                value={form.url}
                onChange={(e) => setField("url", e.target.value)}
                placeholder="https://example.com"
              />
              <FieldError message={errors.url} />
            </div>
            <div className="sm:col-span-2">
              <MediaUploadField
                label="Logo Grup"
                value={form.logoUrl}
                pathPrefix="grup_kami"
                errorContext="Logo grup"
                onChange={(url) => setField("logoUrl", url)}
              />
            </div>
            <div>
              <label className={labelClass}>Urutan (sort_order)</label>
              <input
                type="number"
                min={0}
                max={9999}
                className={inputClass}
                value={form.sortOrder}
                onChange={(e) => setField("sortOrder", Number(e.target.value) || 0)}
              />
              <FieldError message={errors.sortOrder} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) => setField("isVisible", e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0EA5A0]"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Tampil di publik
                </span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={cancel}
              className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "Simpan Perubahan" : "Tambah"}
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <Building2 size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Belum ada grup perusahaan
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan grup perusahaan afiliasi yang tampil di seksi &quot;Grup Kami&quot;.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            <Plus size={15} />
            Tambah Grup
          </button>
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Grup</Th>
              <Th>Nama Legal</Th>
              <Th>Tampil</Th>
              <Th>Urutan</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((g) => (
              <tr
                key={g.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <Td>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden">
                      {g.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.logo_url}
                          alt={g.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Building2 size={16} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white block truncate">
                      {g.name}
                    </span>
                  </div>
                </Td>
                <Td>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {g.legal_name || "—"}
                  </span>
                </Td>
                <Td>
                  <VisibleToggle
                    checked={g.is_visible}
                    disabled={busy}
                    onToggle={() => handleToggle(g)}
                  />
                </Td>
                <Td>
                  <SortCell value={g.sort_order} disabled={busy} onCommit={(n) => commitSort(g, n)} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(g)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    Hapus
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <PaginationBar
        totalItems={groups.length}
        itemsPerPage={ITEMS_PER_PAGE}
        page={safePage}
        onPageChange={setPage}
        noun="grup"
      />

      {pendingDelete && (
        <ConfirmDialog
          title={`Hapus "${pendingDelete.name}"?`}
          description="Grup perusahaan ini akan dihapus permanen dari seksi 'Grup Kami'."
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
