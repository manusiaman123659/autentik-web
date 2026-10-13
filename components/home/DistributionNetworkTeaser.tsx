import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import type { DistributionEntity } from "@/types";

export default async function DistributionNetworkTeaser({ entities, number }: { entities: DistributionEntity[]; number: string | null }) {
  const t = await getTranslations("home.distribution");
  const distributionGroups = entities
    .filter((entity) => entity.distributionType === "group_distribution")
    .slice(0, 2);
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="mx-auto max-w-7xl">
        <AnimatedElement type="fade-up" className="mb-10 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-0.5 w-6 bg-[#0EA5A0]" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">{t("eyebrow")}</p>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h2>
          <p className="mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {t("description")}
          </p>
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid gap-5 lg:grid-cols-2">
          {distributionGroups.map((group) => {
            return (
              <article
                key={group.name}
                className="grid gap-6 rounded-2xl border p-6 sm:grid-cols-[120px_1fr] sm:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex h-28 items-center justify-center rounded-xl border bg-white p-4" style={{ borderColor: "var(--border-subtle)" }}>
                  {group.logoUrl ? <Image src={group.logoUrl} alt={group.name} width={130} height={72} className="max-h-20 w-auto object-contain" /> : <Building2 size={30} className="text-slate-300" />}
                </div>
                <div className="flex flex-col items-start">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0EA5A0]/10 text-[#0EA5A0]">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{group.name}</h3>
                  {group.description && <p className="mt-3 text-sm font-semibold text-[#0EA5A0]">{group.description}</p>}
                  {group.marketSegment && <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{group.marketSegment}</p>}
                </div>
              </article>
            );
          })}
        </AnimatedElement>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/distributors" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0B1F3A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0E2A4D]">
            {t("view")} <ArrowRight size={16} />
          </Link>
          <WhatsAppButton number={number} label={t("contact")} message={t("whatsapp")} id="distribution-contact-mika" className="min-h-11 px-5" />
        </div>

        <div className="mt-6 flex items-start gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <Building2 size={17} className="mt-0.5 shrink-0 text-[#0EA5A0]" />
          <p>{t("verified")}</p>
        </div>
      </div>
    </section>
  );
}
