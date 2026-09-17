"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  MapPin,
  Mail,
  MessageCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { contactSchema, type ContactFormData } from "@/lib/validations/contactSchema";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import WhatsAppButton from "@/components/ui/WhatsAppButton";


const industryOptions = [
  "Farmasi",
  "Kesehatan & Rumah Sakit",
  "Riset",
  "Pendidikan",
  "Makanan & Minuman",
  "Lingkungan",
  "Pertambangan & Energi",
  "Manufaktur",
  "Lainnya",
];

export default function ContactClient({
  ppicAkaNumber,
  mikaSalesNumber,
}: {
  ppicAkaNumber: string | null;
  mikaSalesNumber: string | null;
}) {
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
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
              Hubungi Tim Ahli Kami
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              PT Autentik Karya Analitika memproduksi dan memasarkan IoT Quality
              Monitoring Devices berbasis kebutuhan industri dan teknologi IoT.
              Terhubunglah dengan spesialis teknis kami untuk mengintegrasikan
              solusi produk industri Anda.
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
                  Kirim Pertanyaan
                </h2>

                {submitStatus === "success" ? (
                  <div
                    className="p-6 rounded-xl text-center bg-[#0EA5A0]/10 border border-[#0EA5A0]/20"
                  >
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                      Pertanyaan Terkirim!
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Tim kami akan menghubungi Anda dalam 1–2 hari kerja.
                    </p>
                    <button
                      onClick={() => setSubmitStatus("idle")}
                      className="mt-5 text-sm font-semibold text-[#0EA5A0] hover:underline"
                    >
                      Kirim pertanyaan lain
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Row 1: Name + Email */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          Nama Lengkap <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("fullName")}
                          id="contact-fullname"
                          type="text"
                          placeholder="Jane Doe"
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.fullName
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.fullName && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.fullName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          Email Bisnis <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("email")}
                          id="contact-email"
                          type="email"
                          placeholder="jane@company.com"
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.email ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Company + Industry */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          Nama Perusahaan <span className="text-red-400">*</span>
                        </label>
                        <input
                          {...register("company")}
                          id="contact-company"
                          type="text"
                          placeholder="Acme Corp"
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.company
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        />
                        {errors.company && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.company.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                          Industri <span className="text-red-400">*</span>
                        </label>
                        <select
                          {...register("industry")}
                          id="contact-industry"
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all appearance-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                            errors.industry
                              ? "border-red-400 dark:border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pilih Industri</option>
                          {industryOptions.map((opt) => (
                            <option key={opt} value={opt} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                        {errors.industry && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.industry.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                        Pesan <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        {...register("message")}
                        id="contact-message"
                        rows={5}
                        placeholder="Jelaskan kebutuhan teknis Anda…"
                        className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/30 focus:border-[#0EA5A0] transition-all resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                          errors.message ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700"
                        }`}
                      />
                      {errors.message && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    {submitStatus === "error" && (
                      <p className="text-red-500 text-sm">
                        Terjadi kesalahan. Silakan coba lagi.
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
                        ? "Mengirim…"
                        : "Kirim Pertanyaan →"}
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
                    Kantor Pusat
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
                    Dukungan Langsung
                  </h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Pilih kanal sesuai kebutuhan agar pertanyaan Anda ditangani oleh tim yang tepat.
                  </p>
                  <div className="flex flex-col items-start gap-2">
                    <WhatsAppButton
                      number={ppicAkaNumber}
                      label="Komponen & Pesanan - PPIC AKA"
                      message="Halo PPIC AKA, saya membutuhkan bantuan terkait komponen atau pesanan Marketplace Komponen."
                      variant="link"
                    />
                    <WhatsAppButton
                      number={mikaSalesNumber}
                      label="Produk, Sparepart & Custom - MIKA"
                      message="Halo Admin MIKA, saya ingin berkonsultasi mengenai produk, sparepart, custom, atau distribusi."
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
                Lokasi Kantor Pusat & Cakupan Layanan
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                Berkantor pusat secara strategis di Semarang, PT Autentik Karya Analitika memberikan respons teknis cepat dan dukungan terintegrasi ke seluruh wilayah Indonesia.
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
                title="Peta Lokasi PT Autentik Karya Analitika"
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
                      Kantor Pusat — PT Autentik Karya Analitika
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
                  Buka di Google Maps ↗
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
            Siap Berkolaborasi?
          </h2>
          <p className="text-slate-300 text-base mb-8 max-w-xl mx-auto">
            Temukan bagaimana solusi penyedia produk industri berbasis kebutuhan industri
            dan teknologi IoT dari PT Autentik Karya Analitika dapat mengoptimalkan operasional Anda.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              id="contact-cta-schedule"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-white border-2 border-white/30 hover:border-white/70 hover:bg-white/10 transition-all"
            >
              <Calendar size={16} />
              Jadwalkan Konsultasi
            </Link>
            <Link
              href="/store"
              id="contact-cta-catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-white border-2 border-white/30 hover:border-white/70 hover:bg-white/10 transition-all"
            >
              <BookOpen size={16} />
              Lihat Katalog Produk
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

