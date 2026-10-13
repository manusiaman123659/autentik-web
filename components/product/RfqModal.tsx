"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { X, Loader2, Send, CheckCircle, Phone } from "lucide-react";
import { type RfqFormData } from "@/lib/validations/rfqSchema";
import { getRfqErrorCategory, normalizeRfqFieldErrors, RFQ_PRESENTATION_FIELDS, type RfqErrorCategory, type RfqFieldErrors, type RfqPresentationField } from "@/lib/rfq-presentation";

interface RfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors";

const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

export default function RfqModal({
  isOpen,
  onClose,
  productId,
  productName,
}: RfqModalProps) {
  const t = useTranslations("requests.rfq");
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const [form, setForm] = useState<RfqFormData>({
    productId: productId || "",
    productName: productName || "",
    companyName: "",
    picName: "",
    email: "",
    phoneNumber: "",
    estimatedQuantity: 1,
    targetDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<RfqFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<RfqErrorCategory | null>(null);
  const [result, setResult] = useState<{ rfqCode: string; waUrl?: string } | null>(null);

  const handleClose = useCallback(() => {
    setForm({
      productId: productId || "",
      productName: productName || "",
      companyName: "",
      picName: "",
      email: "",
      phoneNumber: "",
      estimatedQuantity: 1,
      targetDate: "",
      notes: "",
    });
    setErrors({});
    setGeneralError(null);
    setResult(null);
    onCloseRef.current();
  }, [productId, productName]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); handleClose(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]') ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (!first) return;
      if (!modalRef.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [handleClose, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  function set<K extends keyof RfqFormData>(key: K, value: RfqFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setGeneralError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setGeneralError(null);

    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setErrors(normalizeRfqFieldErrors(data.errors));
        setGeneralError(getRfqErrorCategory(res.status));
        setSubmitting(false);
        return;
      }

      setResult({
        rfqCode: data.rfqCode,
        waUrl: data.waUrl,
      });
    } catch {
      setGeneralError("NETWORK");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative mx-auto flex min-h-full w-full max-w-lg items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rfq-dialog-title"
        className="relative pointer-events-auto w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            <h3 id="rfq-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {t("title")}
            </h3>
            {productName && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t("product")} <strong>{productName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={handleClose}
            aria-label={t("close")}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          /* Success State */
          <div className="overflow-y-auto px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t("success.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              {t("success.code")}
            </p>
            <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              {result.rfqCode}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t("success.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {result.waUrl && (
                <a
                  href={result.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <Phone size={16} />
                  {t("success.followUp")}
                </a>
              )}
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t("success.close")}
              </button>
            </div>
          </div>
        ) : (
          /* Form — wraps body + footer so submit button is inside <form> */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0"
            onInputCapture={event => { const target = event.target; if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.setCustomValidity(""); }}
            onInvalidCapture={event => {
              const target = event.target;
              if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
              if (RFQ_PRESENTATION_FIELDS.includes(target.name as RfqPresentationField)) target.setCustomValidity(t("checkField", { field: t(`fields.${target.name}`) }));
            }}>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label htmlFor="rfq-companyName" className={labelClass}>{t("fields.companyName")} *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  id="rfq-companyName" name="companyName"
                  aria-invalid={!!errors.companyName} aria-describedby={errors.companyName ? "rfq-companyName-error" : undefined}
                  onChange={(e) => set("companyName", e.target.value)}
                  className={inputClass}
                  placeholder={t("placeholders.companyName")}
                />
                {errors.companyName && <p id="rfq-companyName-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.companyName") })}</p>}
              </div>

              <div>
                <label htmlFor="rfq-picName" className={labelClass}>{t("fields.picName")} *</label>
                <input
                  type="text"
                  required
                  value={form.picName}
                  id="rfq-picName" name="picName"
                  aria-invalid={!!errors.picName} aria-describedby={errors.picName ? "rfq-picName-error" : undefined}
                  onChange={(e) => set("picName", e.target.value)}
                  className={inputClass}
                  placeholder={t("placeholders.picName")}
                />
                {errors.picName && <p id="rfq-picName-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.picName") })}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rfq-email" className={labelClass}>{t("fields.email")} *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    id="rfq-email" name="email"
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? "rfq-email-error" : undefined}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                    placeholder={t("placeholders.email")}
                  />
                  {errors.email && <p id="rfq-email-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.email") })}</p>}
                </div>

                <div>
                  <label htmlFor="rfq-phoneNumber" className={labelClass}>{t("fields.phoneNumber")} *</label>
                  <input
                    type="tel"
                    required
                    value={form.phoneNumber}
                    id="rfq-phoneNumber" name="phoneNumber"
                    aria-invalid={!!errors.phoneNumber} aria-describedby={errors.phoneNumber ? "rfq-phoneNumber-error" : undefined}
                    onChange={(e) => set("phoneNumber", e.target.value)}
                    className={inputClass}
                    placeholder={t("placeholders.phoneNumber")}
                  />
                  {errors.phoneNumber && <p id="rfq-phoneNumber-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.phoneNumber") })}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rfq-estimatedQuantity" className={labelClass}>{t("fields.estimatedQuantity")} *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.estimatedQuantity}
                    id="rfq-estimatedQuantity" name="estimatedQuantity"
                    aria-invalid={!!errors.estimatedQuantity} aria-describedby={errors.estimatedQuantity ? "rfq-estimatedQuantity-error" : undefined}
                    onChange={(e) => set("estimatedQuantity", Number(e.target.value))}
                    className={inputClass}
                  />
                  {errors.estimatedQuantity && <p id="rfq-estimatedQuantity-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.estimatedQuantity") })}</p>}
                </div>

                <div>
                  <label htmlFor="rfq-targetDate" className={labelClass}>{t("fields.targetDate")} {t("optional")}</label>
                  <input
                    type="date"
                    value={form.targetDate ?? ""}
                    id="rfq-targetDate" name="targetDate"
                    aria-invalid={!!errors.targetDate} aria-describedby={errors.targetDate ? "rfq-targetDate-error" : undefined}
                    onChange={(e) => set("targetDate", e.target.value)}
                    className={inputClass}
                  />
                  {errors.targetDate && <p id="rfq-targetDate-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.targetDate") })}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="rfq-notes" className={labelClass}>{t("fields.notes")} {t("optional")}</label>
                <textarea
                  value={form.notes ?? ""}
                  id="rfq-notes" name="notes"
                  aria-invalid={!!errors.notes} aria-describedby={errors.notes ? "rfq-notes-error" : undefined}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder={t("placeholders.notes")}
                />
                {errors.notes && <p id="rfq-notes-error" className="text-xs text-red-500 mt-1">{t("checkField", { field: t("fields.notes") })}</p>}
              </div>
            </div>

            {/* Fixed footer — now inside <form> so native submit works */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-3">
              {generalError && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <button type="button" aria-label={t("dismissError")} className="shrink-0 text-red-500" onClick={() => setGeneralError(null)}><X size={14} /></button>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{t(`errors.${generalError}`)}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("loading")}
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {t("submit")}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>,
    document.body,
  );
}
