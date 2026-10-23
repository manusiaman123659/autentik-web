"use client";
import Link from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Lightbulb,
  Users,
  Search,
  TrendingUp,
  HeartHandshake,
  Send,
} from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import MikaJobCard from "@/components/careers/MikaJobCard";
import MikaJobFilter from "@/components/careers/MikaJobFilter";
import MikaPagination from "@/components/careers/MikaPagination";
import EmptyState from "@/components/ui/EmptyState";
import type { MikaJob, MikaDepartment, MikaPaginationMeta } from "@/types/mika-career";

interface CareersClientProps {
  initialJobs: MikaJob[];
  initialMeta: MikaPaginationMeta;
  departments: MikaDepartment[];
  available: boolean;
  recruitmentUrl: string | null;
  apiMessage?: string;
}

export default function CareersClient({
  initialJobs,
  initialMeta,
  departments,
  available,
  recruitmentUrl,
  apiMessage,
}: CareersClientProps) {
  const t = useTranslations("careers.ui");
  const [jobs, setJobs] = useState<MikaJob[]>(initialJobs);
  const [meta, setMeta] = useState<MikaPaginationMeta>(initialMeta);
  const [statusMessage, setStatusMessage] = useState(apiMessage);
  const [isAvailable, setIsAvailable] = useState(available);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [isPending, startTransition] = useTransition();
  const hasFilterInteraction = useRef(false);
  const requestSequence = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const hasFilters = searchQuery.trim() !== "" || selectedDept !== "all" || selectedEmploymentType !== "all";

  // Fetch jobs dynamically when filters or page change
  const fetchFilteredJobs = useCallback(
    (pageNumber: number = 1) => {
      const sequence = ++requestSequence.current;
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      startTransition(async () => {
        const searchParams = new URLSearchParams({
          page: String(pageNumber),
          per_page: "10",
        });
        if (searchQuery.trim()) searchParams.set("search", searchQuery.trim());
        if (selectedDept !== "all") searchParams.set("department_id", selectedDept);
        if (selectedEmploymentType !== "all") {
          searchParams.set("employment_type", selectedEmploymentType);
        }

        try {
          const response = await fetch(`/api/careers/jobs?${searchParams.toString()}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.data) || !result.meta) {
            throw new Error(result.message || "Respons lowongan tidak valid");
          }

          if (sequence !== requestSequence.current) return;
          setIsAvailable(true);
          setJobs(result.data);
          setMeta(result.meta);
          setStatusMessage(result.message);
        } catch (error) {
          if (controller.signal.aborted || sequence !== requestSequence.current) return;
          console.error("[Careers] Gagal memperbarui lowongan:", error);
          setIsAvailable(false);
          setJobs([]);
          setMeta({ current_page: 1, per_page: 10, total_items: 0, total_pages: 1, has_next: false, has_prev: false });
          setStatusMessage("Informasi lowongan sedang tidak tersedia. Silakan coba lagi beberapa saat.");
        }
      });
    },
    [searchQuery, selectedDept, selectedEmploymentType]
  );

  useEffect(() => () => requestController.current?.abort(), []);

  // Debounced search trigger
  useEffect(() => {
    if (!hasFilterInteraction.current) return;

    const timer = setTimeout(() => {
      fetchFilteredJobs(1);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedDept, selectedEmploymentType, fetchFilteredJobs]);

  const handleResetFilters = () => {
    hasFilterInteraction.current = true;
    setSearchQuery("");
    setSelectedDept("all");
    setSelectedEmploymentType("all");
  };

  const handlePageChange = (newPage: number) => {
    fetchFilteredJobs(newPage);
    // Smooth scroll to top of job list
    const el = document.getElementById("jobs-list-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* ─── Hero Section ────────────────────────────────────────────────────────── */}
      <section
        className="pt-32 pb-20 relative overflow-hidden public-page-hero"
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-10 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #0EA5A0, transparent)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <AnimatedElement type="fade-up" className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0EA5A0]/15 border border-[#0EA5A0]/30 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} />
              {t("hero.eyebrow")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-heading mb-6 leading-tight">
              {t("hero.title")}
            </h1>

            <p className="text-lg sm:text-xl text-body dark:text-slate-300 leading-relaxed mb-8">
              {t("hero.description")}
            </p>

            {/* Quick Stats Strip */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-base">
              <div>
                <span className="block text-2xl font-bold text-heading">
                   {isAvailable ? meta.total_items : "—"}
                </span>
                <span className="text-sm text-body">{t("hero.positions")}</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <span className="block text-2xl font-bold text-teal-400">
                  {departments.length}
                </span>
                <span className="text-sm text-body">{t("hero.departments")}</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <span className="block text-2xl font-bold text-heading">100%</span>
                <span className="text-sm text-body">{t("hero.growth")}</span>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* ─── Mengapa Bergabung Section ───────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <AnimatedElement type="fade-up">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
                {t("culture.eyebrow")}
              </span>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {t("culture.title")}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {t("culture.description")}
              </p>
            </AnimatedElement>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedElement type="fade-up" delay={0.1}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <Lightbulb size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t("culture.innovationTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {t("culture.innovationDescription")}
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.2}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <Users size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t("culture.teamTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {t("culture.teamDescription")}
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.3}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <TrendingUp size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t("culture.careerTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {t("culture.careerDescription")}
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement type="fade-up" delay={0.4}>
              <div
                className="p-6 rounded-2xl border transition-all hover:shadow-md h-full flex flex-col justify-between"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-[#0EA5A0] flex items-center justify-center mb-5">
                    <HeartHandshake size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {t("culture.welfareTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {t("culture.welfareDescription")}
                  </p>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* ─── Jobs Listing Section ─────────────────────────────────────────────────── */}
      <section
        id="jobs-list-section"
        className="py-20 px-6 lg:px-12 scroll-mt-20"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
                {t("listing.eyebrow")}
              </span>
              <h2
                className="text-3xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {t("listing.title")}
              </h2>
            </div>

            {statusMessage && (
              <div
                className="text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t(isAvailable ? "listing.available" : "states.unavailableDescription")}</span>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <MikaJobFilter
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              hasFilterInteraction.current = true;
              setSearchQuery(value);
            }}
            selectedDepartment={selectedDept}
            onDepartmentChange={(value) => {
              hasFilterInteraction.current = true;
              setSelectedDept(value);
            }}
            selectedEmploymentType={selectedEmploymentType}
            onEmploymentTypeChange={(value) => {
              hasFilterInteraction.current = true;
              setSelectedEmploymentType(value);
            }}
            departments={departments}
            onReset={handleResetFilters}
            totalResults={meta.total_items}
          />

          {/* Loading Indicator */}
          {isPending && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0EA5A0]">
                <div className="w-4 h-4 rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
                {t("listing.loading")}
              </div>
            </div>
          )}

          {/* Jobs Grid or Empty State */}
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <MikaJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title={t(!isAvailable ? "states.unavailable" : hasFilters ? "states.noMatches" : "states.empty")}
              description={!isAvailable
                ? t("states.unavailableDescription")
                : hasFilters ? t("states.noMatchesDescription")
                : t("states.emptyDescription")}
              action={
              <button
                type="button"
                onClick={!isAvailable ? () => fetchFilteredJobs(1) : handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
              >
                {t(!isAvailable ? "states.retry" : "states.resetAll")}
              </button>
              }
            />
          )}

          {/* Pagination */}
          <MikaPagination meta={meta} onPageChange={handlePageChange} />
        </div>
      </section>

      {/* ─── Spontaneous Application / CTA ───────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12 border-t" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedElement type="fade-up">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0EA5A0] mb-2 block">
              {t("cta.eyebrow")}
            </span>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("cta.title")}
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("cta.description")}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {recruitmentUrl ? (
                <a
                  href={recruitmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20"
                >
                  <Send size={16} />
                  {t("cta.apply")}
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0c8e8a] transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20"
                >
                  <Send size={16} />
                  {t("cta.contact")}
                </Link>
              )}
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
