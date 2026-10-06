"use client";

import Link from "next/link";
import {
  MapPin,
  Banknote,
  Users,
  Send,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import type { MikaJob } from "@/types/mika-career";
import MikaCompanyLogo from "@/components/careers/MikaCompanyLogo";

interface MikaJobCardProps {
  job: MikaJob;
}

function getEmploymentBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("full-time") || t.includes("tetap")) {
    return {
      bg: "rgba(14, 165, 160, 0.12)",
      color: "var(--employment-teal)",
      border: "rgba(14, 165, 160, 0.35)",
    };
  }
  if (t.includes("intern") || t.includes("magang")) {
    return {
      bg: "rgba(6, 182, 212, 0.12)",
      color: "var(--employment-cyan)",
      border: "rgba(6, 182, 212, 0.35)",
    };
  }
  if (t.includes("contract") || t.includes("kontrak")) {
    return {
      bg: "rgba(245, 158, 11, 0.12)",
      color: "var(--employment-amber)",
      border: "rgba(245, 158, 11, 0.35)",
    };
  }
  return {
    bg: "rgba(14, 165, 160, 0.12)",
    color: "var(--employment-teal)",
    border: "rgba(14, 165, 160, 0.35)",
  };
}

export default function MikaJobCard({ job }: MikaJobCardProps) {
  const isExpiringSoon = job.deadline_info.days_remaining <= 7 && !job.deadline_info.is_expired;
  const badgeStyle = getEmploymentBadgeStyle(job.employment_type);

  // Format deadline date
  const deadlineText = job.deadline_info.days_remaining > 0
    ? `Batas: ${new Date(job.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`
    : job.deadline_info.badge.label;

  return (
    <div
      className="group relative min-w-0 flex flex-col justify-between rounded-2xl border p-0 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 [--employment-teal:#0f766e] [--employment-cyan:#0e7490] [--employment-amber:#92400e] dark:[--employment-teal:#2dd4bf] dark:[--employment-cyan:#67e8f9] dark:[--employment-amber:#fcd34d]"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* ── Top Section: Company Info + Employment Badge ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3.5 mb-4">
          {/* Company Logo */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <MikaCompanyLogo
              logo={job.company.logo}
              companyName={job.company.name}
              size={48}
              className="w-full h-full object-contain p-1"
            />
          </div>

          {/* Company Name + Department + Job Tag */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold uppercase tracking-wide break-words"
                  style={{ color: "var(--text-primary)" }}
                >
                  {job.company.name}
                </p>
                <p
                  className="text-sm font-medium mt-0.5 text-teal-700 dark:text-teal-300"
                >
                  {job.department.name}
                </p>
              </div>

              {/* Employment Type Badge */}
              <span
                className="inline-flex max-w-full items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide break-words"
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                <Briefcase size={11} />
                {job.employment_type}
              </span>
            </div>

            {/* Position Tag */}
            <div className="mt-2">
              <span
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold border break-words"
                style={{
                  backgroundColor: "rgba(14, 165, 160, 0.08)",
                  borderColor: "rgba(14, 165, 160, 0.25)",
                  color: "#0EA5A0",
                }}
              >
                {job.title}
              </span>
            </div>
          </div>
        </div>

        {/* ── Job Title (Large) ── */}
        <h3 className="text-lg font-bold tracking-tight mb-2 break-words">
          <Link
            href={`/careers/${job.id}`}
            className="transition-colors hover:underline decoration-[#0EA5A0]/40 underline-offset-2"
            style={{ color: "var(--text-primary)" }}
          >
            {job.title}
          </Link>
        </h3>

        {/* ── Description Snippet ── */}
        {job.description && (
          <p
            className="text-sm line-clamp-2 leading-relaxed mb-5"
            style={{ color: "var(--text-secondary)" }}
          >
            {job.description}
          </p>
        )}

        {/* ── Details List (Vertical) ── */}
        <div
          className="space-y-2.5 pt-4 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Location */}
          <div className="flex items-center gap-2.5">
            <MapPin size={15} style={{ color: "var(--text-muted)" }} className="shrink-0" />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {job.location}
            </span>
          </div>

          {/* Salary */}
          <div className="flex items-center gap-2.5">
            <Banknote size={15} className="shrink-0" style={{ color: "#0EA5A0" }} />
            <span className="text-sm font-semibold" style={{ color: "#0EA5A0" }}>
              {job.salary.formatted || "Gaji Dinegosiasikan"}
            </span>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-2.5">
            <CalendarDays
              size={15}
              className="shrink-0"
              style={{ color: isExpiringSoon ? "#EF4444" : "var(--text-muted)" }}
            />
            <span
              className={`text-sm ${isExpiringSoon ? "font-semibold text-red-500 dark:text-red-400" : ""}`}
              style={isExpiringSoon ? {} : { color: "var(--text-secondary)" }}
            >
              {deadlineText}
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer: Quota + CTA Button ── */}
      <div
        className="px-5 py-4 flex flex-wrap gap-3 items-center justify-between border-t mt-1"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "rgba(14, 165, 160, 0.03)",
        }}
      >
        {/* Quota */}
        <div className="flex items-center gap-1.5">
          <Users size={14} style={{ color: "var(--text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Kuota:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {job.quota > 0 ? job.quota : "—"}
            </strong>
          </span>
        </div>

        {/* Detail & Lamar Button */}
        <Link
          href={`/careers/${job.id}`}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0EA5A0] text-white hover:bg-[#0c8e8a] active:scale-95 transition-all"
        >
          <Send size={12} />
          Detail & Lamar
        </Link>
      </div>
    </div>
  );
}
