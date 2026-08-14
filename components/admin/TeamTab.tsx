"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, User, X } from "lucide-react";
import type { TeamMemberRow } from "@/lib/admin-data";
import {
  Badge,
  TableShell,
  Th,
  Td,
  inputClass,
  labelClass,
  FieldError,
} from "@/components/admin/ui";
import { roleColors } from "@/lib/validations/relasiSchema";
import {
  saveTeamMember,
  deleteTeamMember,
  toggleTeamMember,
} from "@/lib/actions/relasi";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MediaUploadField from "@/components/admin/MediaUploadField";
import { VisibleToggle, SortCell } from "@/components/admin/RelasiBits";

interface FormState {
  id: string;
  name: string;
  role: string;
  roleColor: string;
  bio: string;
  imageUrl: string;
  isVisible: boolean;
  sortOrder: number;
}

const emptyForm: FormState = {
  id: "",
  name: "",
  role: "",
  roleColor: "teal",
  bio: "",
  imageUrl: "",
  isVisible: true,
  sortOrder: 0,
};

export default function TeamTab({ team }: { team: TeamMemberRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TeamMemberRow | null>(null);

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

  const openEdit = (m: TeamMemberRow) => {
    setForm({
      id: m.id,
      name: m.name,
      role: m.role,
      roleColor: m.role_color || "teal",
      bio: m.bio || "",
      imageUrl: m.image_url || "",
      isVisible: m.is_visible,
      sortOrder: m.sort_order,
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
    const result = await saveTeamMember(form);
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
    const result = await deleteTeamMember(pendingDelete.id);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    setPendingDelete(null);
    if (result.success) router.refresh();
  };

  const handleToggle = async (m: TeamMemberRow) => {
    setBusy(true);
    const result = await toggleTeamMember(m.id, !m.is_visible);
    setBusy(false);
    toast(result.success ? "success" : "error", result.message);
    if (result.success) router.refresh();
  };

  const commitSort = async (m: TeamMemberRow, next: number) => {
    if (next === m.sort_order) return;
    setBusy(true);
    const result = await saveTeamMember({
      ...m,
      roleColor: m.role_color || "teal",
      bio: m.bio || "",
      imageUrl: m.image_url || "",
      isVisible: m.is_visible,
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
          Tambah Anggota
        </button>
      </div>

      {form && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit ? "Edit Anggota Tim" : "Tambah Anggota Tim"}
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
              <label className={labelClass}>Nama *</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Budi Santoso"
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className={labelClass}>Jabatan *</label>
              <input
                className={inputClass}
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                placeholder="Chief Executive Officer"
              />
              <FieldError message={errors.role} />
            </div>
            <div>
              <label className={labelClass}>Warna Jabatan</label>
              <select
                className={inputClass}
                value={form.roleColor}
                onChange={(e) => setField("roleColor", e.target.value)}
              >
                {roleColors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <FieldError message={errors.roleColor} />
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
            <div className="sm:col-span-2">
              <label className={labelClass}>Bio</label>
              <textarea
                rows={3}
                className={inputClass}
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Deskripsi singkat anggota tim."
              />
              <FieldError message={errors.bio} />
            </div>
            <div className="sm:col-span-2">
              <MediaUploadField
                label="Foto Profil"
                value={form.imageUrl}
                pathPrefix="team"
                errorContext="Foto profil"
                onChange={(url) => setField("imageUrl", url)}
              />
            </div>
            <div className="sm:col-span-2">
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

      {team.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <User size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Belum ada anggota tim
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan anggota tim pertama yang tampil di profil perusahaan.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            <Plus size={15} />
            Tambah Anggota
          </button>
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Anggota</Th>
              <Th>Jabatan</Th>
              <Th>Tampil</Th>
              <Th>Urutan</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <Td>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden">
                      {m.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.image_url}
                          alt={m.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-white block truncate">
                        {m.name}
                      </span>
                      <span className="text-xs text-slate-400">/{m.id}</span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge tone={m.role_color || "slate"}>{m.role}</Badge>
                </Td>
                <Td>
                  <VisibleToggle
                    checked={m.is_visible}
                    disabled={busy}
                    onToggle={() => handleToggle(m)}
                  />
                </Td>
                <Td>
                  <SortCell value={m.sort_order} disabled={busy} onCommit={(n) => commitSort(m, n)} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="inline-flex mr-3 text-xs font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(m)}
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

      {pendingDelete && (
        <ConfirmDialog
          title={`Hapus "${pendingDelete.name}"?`}
          description="Anggota tim ini akan dihapus permanen dari profil perusahaan."
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
