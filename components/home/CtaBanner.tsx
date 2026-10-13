"use client";
import { useTranslations } from "next-intl";

import WhatsAppButton from "@/components/ui/WhatsAppButton";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import HomeRfqButton from "./HomeRfqButton";

export default function CtaBanner({ salesNumber }: { salesNumber: string | null }) {
  const t = useTranslations("home.cta");
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
      }}
    >
      {/* Decorative elements */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #0EA5A0, transparent)" }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <AnimatedElement type="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
            {t("title")}
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            {t("description")}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <HomeRfqButton
              id="cta-request-quotation"
              label={t("quotation")}
              className="rounded-md bg-[#0EA5A0] px-7 py-3.5 text-white hover:bg-[#0D9E98] hover:shadow-lg"
            />
            <WhatsAppButton
              number={salesNumber}
              label={t("contact")}
              message={t("whatsapp")}
              id="cta-contact-sales"
              className="rounded-md border-2 border-white/30 bg-transparent px-7 py-3.5 hover:border-white/70 hover:bg-white/10"
            />
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

