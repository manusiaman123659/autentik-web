"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { APPLICATION_ROLES, isCmsRole, ROLE_LABELS, type CmsRole } from "@/lib/admin-permissions";
import type { StaffRow } from "@/lib/admin-data";
import type { StaffCandidate } from "@/lib/validations/staffSchema";
import { lookupStaffCandidate, manageStaffAccess, provisionStaffAccess } from "@/lib/actions/staff";
import { inputClass, labelClass, Badge } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export default function StaffAccessDialog({ target, mode, meId, soleActiveSuper, onClose }: {
  target?: StaffRow;
  mode: "role" | "status" | "provision";
  meId: string | null;
  soleActiveSuper: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busyLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [candidate, setCandidate] = useState<StaffCandidate | null>(null);
  const [role, setRole] = useState<CmsRole>(target?.role ?? "staff");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(mode === "status");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const account = mode === "provision" ? candidate : target;
  const desiredActive = mode === "status" ? !target?.is_active : target?.is_active ?? true;
  const promotingSuper = role === "super_admin" && account?.role !== "super_admin";

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);

  const close = () => { if (!busyLock.current) onClose(); };
  const start = () => {
    if (busyLock.current) return false;
    dialog.current?.focus();
    busyLock.current = true; setBusy(true); setError(""); return true;
  };
  const finish = () => { busyLock.current = false; setBusy(false); };
  const lookup = () => {
    if (!start()) return;
    setCandidate(null);
    startTransition(async () => {
      try {
        const result = await lookupStaffCandidate({ email });
        if (result.success && result.candidate) setCandidate(result.candidate);
        else setError(result.message);
      } catch { setError("Pencarian akun gagal. Coba kembali."); }
      finally { finish(); }
    });
  };
  const submit = () => {
    if (!account || !start()) return;
    startTransition(async () => {
      try {
        const result = mode === "provision"
          ? await provisionStaffAccess({ targetId: account.id, role, reason })
          : await manageStaffAccess({ targetId: account.id, role, isActive: desiredActive,
            expectedUpdatedAt: target!.updated_at, reason });
        if (!result.success) { setError(result.message); return; }
        toast("success", result.message);
        onClose();
        router.refresh();
      } catch (error) {
        unstable_rethrow(error);
        setError("Hasil perubahan belum dapat dipastikan. Muat ulang daftar sebelum mencoba kembali.");
      }
      finally { finish(); }
    });
  };

  return (
    <dialog ref={dialog} tabIndex={-1} aria-labelledby="staff-access-title" aria-describedby="staff-access-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        if (event.key !== "Tab") return;
        event.preventDefault();
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        if (!controls.length) { event.currentTarget.focus(); return; }
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
          : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        controls[next].focus();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 text-slate-900 dark:text-white shadow-xl backdrop:bg-black/60">
      <h2 id="staff-access-title" className="text-lg font-bold">
        {review ? "Konfirmasi Perubahan Akses" : mode === "provision" ? "Tambah Staff dari Akun" : "Ubah Role"}
      </h2>
      <p id="staff-access-description" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {mode === "provision" ? "Pilih satu akun customer aktif yang sudah terdaftar. Tidak membuat akun Auth baru." : "Perubahan akses berlaku untuk CMS dan dicatat dalam riwayat aktivitas."}
      </p>
      {!review && mode === "provision" && (
        <div className="mt-5">
          <label htmlFor="staff-email" className={labelClass}>Email akun yang tepat</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="staff-email" type="email" autoComplete="off" className={inputClass} value={email} disabled={busy}
              onChange={(event) => { setEmail(event.target.value); setCandidate(null); }} />
            <button type="button" disabled={busy || !email.trim()} onClick={lookup}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Cari Akun</button>
          </div>
        </div>
      )}
      {account && (
        <div className="mt-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1 [overflow-wrap:anywhere]">
          <p className="font-semibold">{account.full_name || account.email} {account.id === meId && <Badge label="Anda" tone="teal" />}</p>
          <p>{account.email}</p>
          <p>Peran saat ini: {ROLE_LABELS[account.role]}</p>
          <p>Status: {account.is_active ? "Aktif" : "Nonaktif"}</p>
        </div>
      )}
      {!review && account && (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="staff-role" className={labelClass}>Peran CMS</label>
            <select id="staff-role" className={inputClass} value={role} disabled={busy} onChange={(event) => setRole(event.target.value as CmsRole)}>
              {APPLICATION_ROLES.filter(isCmsRole).map((value) => (
                <option key={value} value={value} disabled={soleActiveSuper && value !== "super_admin"}>{ROLE_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="staff-reason" className={labelClass}>Alasan (opsional)</label>
            <textarea id="staff-reason" className={inputClass} value={reason} maxLength={500} disabled={busy} onChange={(event) => setReason(event.target.value)} />
          </div>
        </div>
      )}
      {mode === "status" && (
        <div className="mt-4"><label htmlFor="staff-reason" className={labelClass}>Alasan (opsional)</label>
          <textarea id="staff-reason" className={inputClass} value={reason} maxLength={500} disabled={busy} onChange={(event) => setReason(event.target.value)} /></div>
      )}
      {soleActiveSuper && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Minimal satu Super Admin aktif harus tersedia.</p>}
      {promotingSuper && <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-3 text-sm text-amber-900 dark:text-amber-200">
        <AlertTriangle size={18} className="shrink-0" /><p>Akun akan memperoleh seluruh akses CMS, termasuk pengaturan sensitif dan pengelolaan staf.</p></div>}
      {review && account && <div className="mt-4 text-sm space-y-2">
        <p>Peran: <strong>{ROLE_LABELS[account.role]} → {ROLE_LABELS[role]}</strong></p>
        <p>Status: <strong>{desiredActive ? "Aktif" : "Nonaktif"}</strong></p>
        {!desiredActive && <p>Akun ini tidak akan dapat mengakses CMS sampai diaktifkan kembali.</p>}
        {account.id === meId && <p>Jika akses Anda berubah, Anda akan keluar dari halaman pengelolaan staf.</p>}
      </div>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={close} disabled={busy} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm disabled:opacity-50">Batal</button>
        {review && mode !== "status" && <button type="button" disabled={busy} onClick={() => setReview(false)} className="rounded-lg border px-4 py-2.5 text-sm">Kembali</button>}
        <button type="button" disabled={busy || !account || (mode === "role" && role === target?.role)}
          onClick={review ? submit : () => { setError(""); setReview(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0C8C87] disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {review ? "Konfirmasi & Simpan" : "Simpan Perubahan"}
        </button>
      </div>
    </dialog>
  );
}
