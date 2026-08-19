"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { PackageSearch, ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import {
  customRequestSchema,
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
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomRequestFormData>({
    resolver: zodResolver(customRequestSchema),
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
        className="py-20 relative overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "40px 40px" }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedElement type="fade-up" className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} />
              Pesanan Kustom
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">
              Ajukan Kebutuhan <span className="text-[#14B8A6]">Custom</span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
              Beri tahu kami spesifikasi yang Anda butuhkan — tim engineer akan membahas
              kelayakan teknis, estimasi biaya, dan waktu pengerjaan.
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
              Kembali
            </Link>

            <div className="rounded-2xl border shadow-sm p-8" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                Formulir Permintaan Custom
              </h2>

              {submitStatus === "success" ? (
                <div className="p-6 rounded-xl text-center bg-[#0EA5A0]/10 border border-[#0EA5A0]/20">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Permintaan Terkirim!
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Tim teknis kami akan menghubungi Anda dalam 1–2 hari kerja untuk membahas spesifikasi.
                  </p>
                  <button
                    onClick={() => setSubmitStatus("idle")}
                    className="mt-5 text-sm font-semibold text-[#0EA5A0] hover:underline"
                  >
                    Ajukan kebutuhan lain
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {productName && (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-[#0EA5A0]/30 bg-[#0EA5A0]/10">
                      <PackageSearch size={18} className="text-[#0EA5A0] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Produk terkait
                        </p>
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {productName}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                        Nama Lengkap <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register("fullName")}
                        type="text"
                        placeholder="Jane Doe"
                        className={`${inputClass} ${errors.fullName ? "border-red-400 dark:border-red-500" : ""}`}
                      />
                      {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                        Email Bisnis <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="jane@company.com"
                        className={`${inputClass} ${errors.email ? "border-red-400 dark:border-red-500" : ""}`}
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                      Nama Perusahaan <span className="text-slate-400">(opsional)</span>
                    </label>
                    <input
                      {...register("company")}
                      type="text"
                      placeholder="Acme Corp"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                      Kebutuhan & Spesifikasi <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      {...register("message")}
                      rows={6}
                      placeholder="Jelaskan spesifikasi custom Anda — dimensi, material, jumlah, deadline, dll…"
                      className={`${inputClass} resize-none ${errors.message ? "border-red-400 dark:border-red-500" : ""}`}
                    />
                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
                  </div>

                  {submitStatus === "error" && (
                    <p className="text-red-500 text-sm">Terjadi kesalahan. Silakan coba lagi.</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitStatus === "loading"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50"
                    style={{ backgroundColor: "#0EA5A0" }}
                  >
                    {submitStatus === "loading" ? "Mengirim…" : "Kirim Permintaan Custom →"}
                  </button>

                  <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <MessageCircle size={13} />
                    Butuh lebih cepat? Hubungi kami via WhatsApp di{" "}
                    <WhatsAppButton
                      number={waNumber}
                      label="WhatsApp CS / Sales"
                      message="Halo, saya ingin konsultasi produk custom"
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
