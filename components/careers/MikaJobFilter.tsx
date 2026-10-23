"use client";

import { Search, X, Filter, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MikaDepartment } from "@/types/mika-career";

interface MikaJobFilterProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (val: string) => void;
  selectedEmploymentType: string;
  onEmploymentTypeChange: (val: string) => void;
  departments: MikaDepartment[];
  onReset: () => void;
  totalResults: number;
}

const EMPLOYMENT_TYPES = [
  { label: "filter.allTypes", value: "all" },
  { label: "employment.Full-time", value: "Full-time" },
  { label: "employment.Internship", value: "Internship" },
  { label: "employment.Part-time", value: "Part-time" },
  { label: "employment.Contract", value: "Contract" },
];

export default function MikaJobFilter({
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedEmploymentType,
  onEmploymentTypeChange,
  departments,
  onReset,
  totalResults,
}: MikaJobFilterProps) {
  const t = useTranslations("careers.ui");
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedDepartment !== "all" ||
    selectedEmploymentType !== "all";

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6 mb-8 shadow-sm transition-all"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Search Input Bar */}
      <div className="relative mb-5">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          aria-label={t("filter.search")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filter.placeholder")}
          className="w-full pl-11 pr-10 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/20 focus:border-[#0EA5A0]"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            style={{ color: "var(--text-muted)" }}
            title={t("filter.clear")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {/* Department Filter (2nd) */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("filter.department")}
          </label>
          <div className="relative">
            <select
              aria-label={t("filter.departmentLabel")}
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:border-[#0EA5A0] appearance-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">{t("filter.allDepartments")}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </option>
              ))}
            </select>
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ▼
            </div>
          </div>
        </div>

        {/* Employment Type Filter (3rd) */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("filter.employment")}
          </label>
          <div className="relative">
            <select
              aria-label={t("filter.employmentLabel")}
              value={selectedEmploymentType}
              onChange={(e) => onEmploymentTypeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:border-[#0EA5A0] appearance-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(type.label)}
                </option>
              ))}
            </select>
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Badges & Reset Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <Filter size={13} className="text-[#0EA5A0]" />
          <span>
            {t.rich("filter.results", { count: totalResults, strong: chunks => <strong style={{ color: "var(--text-primary)" }}>{chunks}</strong> })}
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
          >
            <RotateCcw size={12} />
            {t("filter.reset")}
          </button>
        )}
      </div>
    </div>
  );
}
