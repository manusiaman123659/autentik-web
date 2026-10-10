"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Crop, Loader2, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { getCroppedImg } from "@/lib/media/cropImage";

interface ImageCropperModalProps {
  imageSrc: string;
  sourceName?: string;
  progressText?: string;
  opener?: HTMLElement | null;
  onApply: (croppedBlob: Blob) => void | Promise<void>;
  onError: (stage: "source" | "crop") => void;
  onClose: () => void;
}

export default function ImageCropperModal({ imageSrc, sourceName, opener, progressText = "Memproses hasil crop…", onApply, onError, onClose }: ImageCropperModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(true);
  const applyLock = useRef(false);
  const request = useRef<object | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    active.current = true;
    const element = dialog.current;
    const previous = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    element?.showModal();
    return () => {
      active.current = false; request.current = null;
      element?.close();
      requestAnimationFrame(() => { if (previous?.isConnected && !previous.matches(":disabled")) previous.focus(); });
    };
  }, [opener]);

  const onCropComplete = useCallback((_: unknown, pixels: { x: number; y: number; width: number; height: number }) => {
    if (active.current && !applyLock.current) setCroppedAreaPixels(pixels);
  }, []);

  function close() {
    if (!active.current) return;
    active.current = false; request.current = null;
    onClose();
  }

  function fail(stage: "source" | "crop") {
    if (!active.current) return;
    active.current = false; request.current = null;
    onError(stage);
  }

  async function handleApply() {
    if (!active.current || applyLock.current || !croppedAreaPixels) return;
    applyLock.current = true;
    const token = {}; request.current = token;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, { ...croppedAreaPixels }, rotation);
      if (!active.current || request.current !== token) return;
      await onApply(blob);
    } catch {
      if (active.current && request.current === token) fail("crop");
    } finally {
      if (active.current && request.current === token) { applyLock.current = false; setProcessing(false); }
    }
  }

  const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-[#0EA5A0] hover:text-[#0EA5A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A0] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300";

  return <dialog ref={dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.getClientRects().length > 0);
      if (!controls.length) return;
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }}
    className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
      <div className="min-w-0">
        <h2 id={titleId} className="flex items-center gap-2 text-sm font-bold"><Crop size={18} aria-hidden="true" className="text-[#0EA5A0]" />Atur &amp; Potong Foto Profil</h2>
        {sourceName && <p className="mt-1 text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">Sumber sementara: {sourceName}</p>}
      </div>
      <button type="button" autoFocus onClick={close} aria-label="Tutup pemotongan" className={controlClass}><X size={18} aria-hidden="true" /></button>
    </div>
    <div aria-busy={processing} className="relative h-72 bg-slate-950 sm:h-80">
      <Cropper image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={1} cropShape="round"
        onCropChange={value => { if (!applyLock.current) setCrop(value); }}
        onZoomChange={value => { if (!applyLock.current) setZoom(value); }} onCropComplete={onCropComplete}
        mediaProps={{ onError: () => fail("source") }}
        cropperProps={{ "aria-label": "Area potong foto" }}
        classes={{ cropAreaClassName: "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0EA5A0]" }} />
    </div>
    <div className="space-y-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <button type="button" disabled={processing} aria-label="Perkecil foto" className={controlClass} onClick={() => setZoom(value => Math.max(1, value - 0.1))}><ZoomOut size={16} aria-hidden="true" /></button>
        <input type="range" aria-label="Zoom foto" aria-valuetext={`${zoom.toFixed(2)} kali`} min={1} max={3} step={0.01} value={zoom} disabled={processing}
          onChange={event => setZoom(Number(event.target.value))} className="h-11 min-w-0 flex-1 accent-[#0EA5A0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0EA5A0]" />
        <button type="button" disabled={processing} aria-label="Perbesar foto" className={controlClass} onClick={() => setZoom(value => Math.min(3, value + 0.1))}><ZoomIn size={16} aria-hidden="true" /></button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={processing} className={controlClass} onClick={() => setRotation(value => value - 90)}><RotateCcw size={16} aria-hidden="true" />Putar Kiri</button>
        <button type="button" disabled={processing} className={controlClass} onClick={() => setRotation(value => value + 90)}><RotateCw size={16} aria-hidden="true" />Putar Kanan</button>
      </div>
      <p role="status" aria-live="polite" className="text-center text-xs text-slate-500 dark:text-slate-400">{processing ? progressText : "Atur posisi dan zoom. Foto belum diunggah sampai Anda memilih Gunakan Foto Ini."}</p>
    </div>
    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
      <button type="button" onClick={close} className={controlClass}>Batal</button>
      <button type="button" onClick={handleApply} disabled={processing || !croppedAreaPixels}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0EA5A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0C8C87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A0] focus-visible:ring-offset-2 disabled:opacity-50">
        {processing ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Crop size={16} aria-hidden="true" />}Gunakan Foto Ini
      </button>
    </div>
  </dialog>;
}
