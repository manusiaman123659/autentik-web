"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "@/i18n/navigation";
import { PackageSearch, ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import {
  createCustomRequestSchema,
  type CustomRequestFormData,
} from "@/lib/validations/contactSchema";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

export default function CustomRequestClient({
  productSlug,
  productName,
  waNumber,
}: {
  productSlug: string | null;
  productName: string | null;
  waNumber: string | null;
}) {
  const t = useTranslations("requests.custom");
  const validation = { fullName: t("validation.fullName"), email: t("validation.email"), message: t("validation.message") };
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomRequestFormData>({
    resolver: zodResolver(createCustomRequestSchema(validation)),
    defaultValues: {
      category: "custom_request",
      fullName: "",
      email: "",
      company: "",
      message: "",
      productSlug: productSlug ?? "",
      productName: productName ?? "",
    },
  });

  const onSubmit = async (data: CustomRequestFormData) => {
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSubmitStatus("success");
        reset();
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500`;

  return (
    <>
      {/* Header */}
      <section
        className="py-20 relative overflow-hidden text-heading public-page-hero"
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "40px 40px" }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up" className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">
              {t("hero.heading")} <span className="text-teal-700 dark:text-teal-300">{t("hero.highlight")}</span>
            </h1>
            <p className="text-body dark:text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </AnimatedElement>
        </div>
      </section>

      {/* Form */}
      <section className="py-14" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <Link
              href={productSlug ? `/products/${productSlug}` : "/products"}
              className="inline-flex items-center gap-1.5 text-sm mb-6 hover:text-[#14B8A6] transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={14} />
              {t("form.back")}
            </Link>

            <div className="rounded-2xl border shadow-sm p-5 sm:p-8" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                {t("form.title")}
              </h2>

              {submitStatus === "success" ? (
                <div role="status" className="p-6 rounded-xl text-center bg-[#0EA5A0]/10 border border-[#0EA5A0]/20">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t("status.success")}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t("status.description")}
                  </p>
                  <button
                    onClick={() => setSubmitStatus("idle")}
                    className="mt-5 text-sm font-semibold text-[#0EA5A0] hover:underline"
                  >
                    {t("status.again")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {productName && (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-[#0EA5A0]/30 bg-[#0EA5A0]/10">
                      <PackageSearch size={18} className="text-[#0EA5A0] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {t("form.product")}
                        </p>
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {productName}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="custom-fullname" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                        {t("form.fullName")} <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register("fullName")}
                        id="custom-fullname"
                        type="text"
                        placeholder={t("form.namePlaceholder")}
                        aria-invalid={!!errors.fullName}
                        aria-describedby={errors.fullName ? "custom-fullname-error" : undefined}
                        className={`${inputClass} ${errors.fullName ? "border-red-400 dark:border-red-500" : ""}`}
                      />
                      {errors.fullName && <p id="custom-fullname-error" className="text-red-500 text-xs mt-1">{validation.fullName}</p>}
                    </div>
                    <div>
                      <label htmlFor="custom-email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                        {t("form.email")} <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register("email")}
                        id="custom-email"
                        type="email"
                        placeholder={t("form.emailPlaceholder")}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "custom-email-error" : undefined}
                        className={`${inputClass} ${errors.email ? "border-red-400 dark:border-red-500" : ""}`}
                      />
                      {errors.email && <p id="custom-email-error" className="text-red-500 text-xs mt-1">{validation.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="custom-company" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                      {t("form.company")} <span className="text-slate-400">{t("form.optional")}</span>
                    </label>
                    <input
                      {...register("company")}
                      id="custom-company"
                      type="text"
                      placeholder={t("form.companyPlaceholder")}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="custom-message" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                      {t("form.message")} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      {...register("message")}
                      id="custom-message"
                      rows={6}
                      placeholder={t("form.messagePlaceholder")}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? "custom-message-error" : undefined}
                      className={`${inputClass} resize-none ${errors.message ? "border-red-400 dark:border-red-500" : ""}`}
                    />
                    {errors.message && <p id="custom-message-error" className="text-red-500 text-xs mt-1">{validation.message}</p>}
                  </div>

                  {submitStatus === "error" && (
                    <p role="alert" className="text-red-500 text-sm">{t("status.error")}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitStatus === "loading"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50"
                    style={{ backgroundColor: "#0EA5A0" }}
                  >
                    {t(submitStatus === "loading" ? "form.loading" : "form.submit")}
                  </button>

                  <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <MessageCircle size={13} />
                    {t("form.help")}{" "}
                    <WhatsAppButton
                      number={waNumber}
                      label={t("form.contact")}
                      message={t("form.whatsapp")}
                      variant="link"
                    />
                  </p>
                </form>
              )}
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
