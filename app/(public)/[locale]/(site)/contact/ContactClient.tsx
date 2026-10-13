"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "@/i18n/navigation";
import {
  MapPin,
  Mail,
  MessageCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { createContactSchema, type ContactFormData } from "@/lib/validations/contactSchema";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import WhatsAppButton from "@/components/ui/WhatsAppButton";


const industryOptions = [
  { value: "Farmasi", key: "pharmaceutical" },
  { value: "Kesehatan & Rumah Sakit", key: "healthcare" },
  { value: "Riset", key: "research" },
  { value: "Pendidikan", key: "education" },
  { value: "Makanan & Minuman", key: "food" },
  { value: "Lingkungan", key: "environment" },
  { value: "Pertambangan & Energi", key: "mining" },
  { value: "Manufaktur", key: "manufacturing" },
  { value: "Lainnya", key: "other" },
];

export default function ContactClient({
  ppicAkaNumber,
  mikaSalesNumber,
}: {
  ppicAkaNumber: string | null;
  mikaSalesNumber: string | null;
}) {
  const t = useTranslations("contact.ui");
  const validation = { fullName: t("validation.fullName"), email: t("validation.email"), company: t("validation.company"), industry: t("validation.industry"), message: t("validation.message") };
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(createContactSchema(validation)),
  });

  const onSubmit = async (data: ContactFormData) => {
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

  return (
    <>
      {/* Header */}
      <section className="pt-16 pb-12" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-5 max-w-2xl" style={{ color: "var(--text-primary)" }}>
              {t("hero.title")}
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              {t("hero.description")}
            </p>
          </AnimatedElement>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="stagger" className="grid lg:grid-cols-5 gap-8">
            {/* Inquiry Form - takes 3/5 */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border shadow-sm p-8 bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700/80 transition-colors duration-300">
                <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                  {t("form.title")}
                </h2>

                {submitStatus === "success" ? (
                  <div
                    role="status"
                    className="p-6 rounded-xl text-center bg-[#0EA5A0]/10 border border-[#0EA5A0]/20"
                  >
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                      {t("status.success")}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
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
                    {/* Row 1: Name + Email */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-fullname" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          {t("form.fullName")} <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("fullName")}
                          id="contact-fullname"
                          type="text"
                          placeholder={t("form.namePlaceholder")}
                          aria-invalid={!!errors.fullName}
                          aria-describedby={errors.fullName ? "contact-fullname-error" : undefined}
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.fullName
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.fullName && (
                          <p id="contact-fullname-error" className="text-red-500 text-xs mt-1">
                            {validation.fullName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          {t("form.email")} <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("email")}
                          id="contact-email"
                          type="email"
                          placeholder={t("form.emailPlaceholder")}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? "contact-email-error" : undefined}
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.email ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.email && (
                          <p id="contact-email-error" className="text-red-500 text-xs mt-1">
                            {validation.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Company + Industry */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-company" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          {t("form.company")} <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("company")}
                          id="contact-company"
                          type="text"
                          placeholder={t("form.companyPlaceholder")}
                          aria-invalid={!!errors.company}
                          aria-describedby={errors.company ? "contact-company-error" : undefined}
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.company
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.company && (
                          <p id="contact-company-error" className="text-red-500 text-xs mt-1">
                            {validation.company}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="contact-industry" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          {t("form.industry")} <span className="text-red-400">*</span>
                        </label>
                        <select
                          {...register("industry")}
                          id="contact-industry"
                          aria-invalid={!!errors.industry}
                          aria-describedby={errors.industry ? "contact-industry-error" : undefined}
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all appearance-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                            errors.industry
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t("form.industryPlaceholder")}</option>
                          {industryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                              {t(`industries.${opt.key}`)}
                            </option>
                          ))}
                        </select>
                        {errors.industry && (
                          <p id="contact-industry-error" className="text-red-500 text-xs mt-1">
                            {validation.industry}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                        {t("form.message")} <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        {...register("message")}
                        id="contact-message"
                        rows={5}
                        placeholder={t("form.messagePlaceholder")}
                        aria-invalid={!!errors.message}
                        aria-describedby={errors.message ? "contact-message-error" : undefined}
                        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                          errors.message ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700"
                        }`}
                      />
                      {errors.message && (
                        <p id="contact-message-error" className="text-red-500 text-xs mt-1">
                          {validation.message}
                        </p>
                      )}
                    </div>

                    {submitStatus === "error" && (
                      <p role="alert" className="text-red-500 text-sm">
                        {t("status.error")}
                      </p>
                    )}

                    <button
                      type="submit"
                      id="contact-submit"
                      disabled={submitStatus === "loading"}
                      className="w-full sm:w-auto inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50"
                      style={{ backgroundColor: "#0EA5A0" }}
                    >
                      {submitStatus === "loading"
                        ? t("form.loading")
                        : t("form.submit")}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Info Cards - takes 2/5 */}
            <div className="lg:col-span-2 space-y-5">
              {/* HQ Card */}
              <div className="rounded-2xl border shadow-sm p-6 bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700/80 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={20} className="text-[#0EA5A0]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("office.title")}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed mb-4 text-slate-600 dark:text-slate-300">
                  Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang,
                  Kota Semarang, Jawa Tengah 50272
                </p>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500" />
                  <a
                    href="mailto:autentik.info@gmail.com"
                    className="text-sm text-[#0EA5A0] hover:underline font-medium"
                  >
                    autentik.info@gmail.com
                  </a>
                </div>
              </div>

              {/* Direct Support Card */}
              <div className="rounded-2xl border shadow-sm p-6 bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700/80 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-5">
                  <MessageCircle size={20} className="text-[#0EA5A0]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("support.title")}
                  </h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {t("support.description")}
                  </p>
                  <div className="flex flex-col items-start gap-2">
                    <WhatsAppButton
                      number={ppicAkaNumber}
                      label={t("support.components")}
                      message={t("support.componentsMessage")}
                      variant="link"
                    />
                    <WhatsAppButton
                      number={mikaSalesNumber}
                      label={t("support.sales")}
                      message={t("support.salesMessage")}
                      variant="link"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* Map / Headquarters Location */}
      <section className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                {t("map.title")}
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                {t("map.description")}
              </p>
            </div>

            {/* Google Maps Location / Map Card */}
            <div
              className="w-full rounded-2xl border shadow-sm overflow-hidden relative"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <iframe
                title={t("map.accessibleTitle")}
                src="https://maps.google.com/maps?q=Ruko+Amsterdam+No.9E,+Jln.+Klipang+Raya,+Sendangmulyo,+Tembalang,+Semarang&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="380"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full grayscale contrast-125 opacity-90 dark:invert dark:hue-rotate-180 transition-all"
              />
              <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(14,165,160,0.12)" }}>
                    <MapPin size={20} className="text-[#0EA5A0]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {t("office.mapHeading")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Ruko Amsterdam No.9E, Jl. Klipang Raya, Sendangmulyo, Tembalang, Semarang, Jawa Tengah 50272
                    </p>
                  </div>
                </div>
                <a
                  href="https://maps.google.com/?q=Ruko+Amsterdam+No.9E,+Jln.+Klipang+Raya,+Sendangmulyo,+Tembalang,+Semarang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: "#0EA5A0" }}
                >
                  {t("map.open")}
                </a>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>


      {/* CTA */}
      <section
        className="py-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-slate-300 text-base mb-8 max-w-xl mx-auto">
            {t("cta.description")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              id="contact-cta-schedule"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-white border-2 border-white/30 hover:border-white/70 hover:bg-white/10 transition-all"
            >
              <Calendar size={16} />
              {t("cta.schedule")}
            </Link>
            <Link
              href="/store"
              id="contact-cta-catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-white border-2 border-white/30 hover:border-white/70 hover:bg-white/10 transition-all"
            >
              <BookOpen size={16} />
              {t("cta.catalogue")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

