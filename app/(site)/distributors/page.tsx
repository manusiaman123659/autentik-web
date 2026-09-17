import type { Metadata } from "next";
import Image from "next/image";
import { Building2, Globe2, Mail, MapPin, Network, Phone, UserRound } from "lucide-react";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import { getWhatsAppContact, listPublicDistributionEntities } from "@/lib/public-data";
import { DISTRIBUTION_TYPE_LABELS } from "@/lib/validations/distributionSchema";
import type { DistributionEntity } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jaringan Distributor | PT Autentik Karya Analitika",
  description:
    "Informasi kanal distribusi grup, distributor, dan sub-distributor produk PT Autentik Karya Analitika dengan koordinasi melalui MIKA.",
  alternates: { canonical: "/distributors" },
};

function DistributionCard({
  entity,
  parentName,
  headingLevel = "h3",
}: {
  entity: DistributionEntity;
  parentName?: string;
  headingLevel?: "h3" | "h4";
}) {
  const Heading = headingLevel;
  const regionKey = entity.regionLabel?.trim().toLocaleLowerCase("id-ID");
  const location = [entity.city, entity.province]
    .filter((value) => value && value.trim().toLocaleLowerCase("id-ID") !== regionKey)
    .join(", ");

  return (
    <article
      className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-[112px_1fr] sm:p-6"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex h-24 items-center justify-center rounded-xl border bg-white p-3" style={{ borderColor: "var(--border-subtle)" }}>
        {entity.logoUrl ? (
          <Image src={entity.logoUrl} alt={entity.name} width={120} height={72} className="max-h-16 w-auto object-contain" />
        ) : (
          <Building2 size={30} className="text-slate-300" />
        )}
      </div>

      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-[#0EA5A0]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0C8C87]">
          {DISTRIBUTION_TYPE_LABELS[entity.distributionType]}
        </span>
        <Heading className="mt-3 text-xl font-bold" style={{ color: "var(--text-primary)" }}>{entity.name}</Heading>
        {entity.legalName && entity.legalName !== entity.name && (
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{entity.legalName}</p>
        )}
        {entity.description && <p className="mt-3 text-sm font-semibold text-[#0EA5A0]">{entity.description}</p>}
        {entity.marketSegment && <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{entity.marketSegment}</p>}
        {parentName && <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>Bagian dari jaringan: {parentName}</p>}

        {(entity.regionLabel || location || entity.address) && (
          <div className="mt-4 flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#0EA5A0]" />
            <span>{[entity.regionLabel, location, entity.address].filter(Boolean).join(" · ")}</span>
          </div>
        )}

        {(entity.contactName || entity.phone || entity.email || entity.websiteUrl) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
            {entity.contactName && <span className="inline-flex items-center gap-1.5"><UserRound size={15} />{entity.contactName}</span>}
            {entity.phone && <a href={`tel:${entity.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#0EA5A0]"><Phone size={15} />{entity.phone}</a>}
            {entity.email && <a href={`mailto:${entity.email}`} className="inline-flex items-center gap-1.5 hover:text-[#0EA5A0]"><Mail size={15} />{entity.email}</a>}
            {entity.websiteUrl && <a href={entity.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#0EA5A0]"><Globe2 size={15} />Website</a>}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function DistributorsPage() {
  const [entities, mikaContact] = await Promise.all([
    listPublicDistributionEntities(),
    getWhatsAppContact("mika_distributor_inquiry"),
  ]);
  const groupDistribution = entities.filter((entity) => entity.distributionType === "group_distribution");
  const directory = entities.filter((entity) => entity.distributionType !== "group_distribution");
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]));
  const regional = new Map<string, { label: string; entities: DistributionEntity[] }>();
  const ungrouped: DistributionEntity[] = [];

  for (const entity of directory) {
    const region = entity.regionLabel?.trim() || entity.city?.trim() || entity.province?.trim();
    if (!region) {
      ungrouped.push(entity);
      continue;
    }
    const key = region.toLocaleLowerCase("id-ID");
    const current = regional.get(key);
    regional.set(key, {
      label: current?.label ?? region,
      entities: [...(current?.entities ?? []), entity],
    });
  }

  return (
    <main className="flex-grow">
      <section className="relative overflow-hidden bg-[#0B1F3A] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-5 flex items-center gap-3 text-[#14B8A6]"><Network size={22} /><span className="text-xs font-bold uppercase tracking-[0.22em]">Jaringan Distribusi</span></div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Akses informasi jaringan distribusi produk AKA</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">AKA berperan sebagai manufacturer. Informasi kebutuhan pembelian dan penentuan distributor atau sub-distributor yang sesuai dikoordinasikan melalui MIKA.</p>
        </div>
      </section>

      {groupDistribution.length > 0 && (
        <section className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <div className="mx-auto max-w-7xl">
            <AnimatedElement type="fade-up" className="mb-10 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">Kanal Distribusi Grup</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Marketing dan distribusi dalam ekosistem grup</h2>
              <p className="mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>Kanal distribusi grup ditampilkan berdasarkan informasi yang telah dikelola dan diverifikasi oleh AKA.</p>
            </AnimatedElement>
            <AnimatedElement type="stagger" className="grid gap-5 lg:grid-cols-2">
              {groupDistribution.map((entity) => <DistributionCard key={entity.id} entity={entity} />)}
            </AnimatedElement>
          </div>
        </section>
      )}

      {directory.length > 0 && (
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">Distributor Resmi</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Direktori distributor dan sub-distributor</h2>
            </div>

            {[...regional.entries()].map(([key, group]) => (
              <section key={key} className="mb-12 last:mb-0">
                <div className="mb-5 flex items-center gap-2"><MapPin size={18} className="text-[#0EA5A0]" /><h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{group.label}</h3></div>
                <div className="grid gap-5 lg:grid-cols-2">{group.entities.map((entity) => <DistributionCard key={entity.id} entity={entity} parentName={entity.parentId ? entityNames.get(entity.parentId) : undefined} headingLevel="h4" />)}</div>
              </section>
            ))}

            {ungrouped.length > 0 && (
              <section>
                <h3 className="mb-5 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Jaringan Distribusi Lainnya</h3>
                <div className="grid gap-5 lg:grid-cols-2">{ungrouped.map((entity) => <DistributionCard key={entity.id} entity={entity} parentName={entity.parentId ? entityNames.get(entity.parentId) : undefined} headingLevel="h4" />)}</div>
              </section>
            )}
          </div>
        </section>
      )}

      <section className="bg-[#0B1F3A] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#14B8A6]">Koordinasi Distribusi</p><h2 className="mt-3 text-3xl font-bold">Butuh distributor di wilayah Anda?</h2><p className="mt-3 max-w-2xl text-slate-300">Sampaikan kebutuhan dan wilayah Anda kepada Admin MIKA. MIKA akan membantu mengarahkan jalur distributor atau sub-distributor yang sesuai.</p></div>
          <WhatsAppButton number={mikaContact?.number ?? null} label="Hubungi MIKA" message="Halo Admin MIKA, saya membutuhkan informasi distributor atau sub-distributor produk AKA sesuai wilayah dan kebutuhan saya." id="distributor-contact-mika" className="h-12 shrink-0 px-6" />
        </div>
      </section>
    </main>
  );
}
