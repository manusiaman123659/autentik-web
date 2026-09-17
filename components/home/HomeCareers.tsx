import Link from "next/link";
import { ArrowRight, Briefcase, Building2, MapPin } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import type { MikaJob } from "@/types/mika-career";

function plainText(value?: string): string {
  return (value ?? "").replace(/<[^>]*>?/g, " ").replace(/\s+/g, " ").trim();
}

export default function HomeCareers({ items }: { items: MikaJob[] }) {
  const featured = items.slice(0, 3);

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" id="careers" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="mx-auto max-w-7xl">
        <AnimatedElement type="fade-up" className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-0.5 w-6 bg-[#0EA5A0]" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">Mika Career</p>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
              Peluang untuk Bertumbuh Bersama
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Temukan posisi yang tersedia melalui portal rekrutmen Mika Career.
            </p>
          </div>
          <Link href="/careers" className="inline-flex items-center gap-2 text-sm font-bold text-[#0EA5A0] hover:underline">
            Lihat Semua Lowongan
            <ArrowRight size={16} />
          </Link>
        </AnimatedElement>

        {featured.length > 0 ? (
          <AnimatedElement type="stagger" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((job) => (
              <article
                key={job.id}
                className="flex min-h-72 flex-col border-t-2 border-[#0EA5A0] p-6 transition-transform duration-300 hover:-translate-y-1"
                style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#0EA5A0]">
                    <Briefcase size={13} />
                    {job.employment_type}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{job.department.name}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {job.title}
                </h3>
                {job.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {plainText(job.description)}
                  </p>
                )}
                <div className="mt-auto space-y-2 border-t pt-5 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                  <p className="flex items-center gap-2"><Building2 size={14} className="shrink-0 text-[#0EA5A0]" />{job.company.name}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-[#0EA5A0]" />{job.location}</p>
                </div>
                <Link
                  href={`/careers/${job.id}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0EA5A0] hover:underline"
                >
                  Lihat Detail
                  <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </AnimatedElement>
        ) : (
          <AnimatedElement type="fade-up">
            <div className="border py-12 text-center" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Belum ada posisi terbuka saat ini.</p>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Pantau halaman karir untuk informasi lowongan terbaru.</p>
            </div>
          </AnimatedElement>
        )}
      </div>
    </section>
  );
}
