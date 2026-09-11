"use client";

import Link from "next/link";
import {
  Building2,
  MapPin,
  Clock,
  Banknote,
  Users,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import type { MikaJob } from "@/types/mika-career";

interface MikaJobCardProps {
  job: MikaJob;
}

function getEmploymentBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("full-time") || t.includes("tetap")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (t.includes("intern") || t.includes("magang")) {
    return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
  }
  if (t.includes("contract") || t.includes("kontrak")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }
  return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30";
}

export default function MikaJobCard({ job }: MikaJobCardProps) {
  const isExpiringSoon = job.deadline_info.days_remaining <= 7 && !job.deadline_info.is_expired;

  return (
    <div
      className="group relative flex flex-col justify-between rounded-xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-teal-950/5 dark:hover:shadow-teal-900/10 hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div>
        {/* Header Tags: Employment Type & Department */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getEmploymentBadgeStyle(
                job.employment_type
              )}`}
            >
              <Briefcase size={12} />
              {job.employment_type}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {job.department.name}
            </span>
          </div>

          {/* Quota */}
          {job.quota > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Users size={12} />
              Kuota: <strong style={{ color: "var(--text-primary)" }}>{job.quota}</strong>
            </span>
          )}
        </div>

        {/* Job Title */}
        <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-[#0EA5A0] transition-colors">
          <Link href={`/careers/${job.id}`} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            <span style={{ color: "var(--text-primary)" }}>{job.title}</span>
          </Link>
        </h3>

        {/* Company & Location */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={14} className="text-[#0EA5A0]" />
            {job.company.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-[#0EA5A0]" />
            {job.location}
          </span>
        </div>

        {/* Description snippet */}
        {job.description && (
          <p
            className="text-sm line-clamp-2 mb-4 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {job.description.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}

        {/* Skills Pills */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span
                className="px-1.5 py-0.5 rounded text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Details: Salary & Deadline */}
      <div
        className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* Salary */}
        <div className="flex items-center gap-1.5">
          <Banknote size={16} className="text-emerald-500 shrink-0" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {job.salary.formatted || "Gaji Dinegosiasikan"}
          </span>
        </div>

        {/* Deadline & CTA */}
        <div className="flex items-center justify-between sm:justify-end gap-3 relative z-10">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isExpiringSoon
                ? "text-red-500 dark:text-red-400 font-semibold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Clock size={13} />
            {job.deadline_info.days_remaining > 0
              ? `${job.deadline_info.days_remaining} hari lagi`
              : job.deadline_info.badge.label}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5A0] group-hover:translate-x-0.5 transition-transform">
            Detail
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
