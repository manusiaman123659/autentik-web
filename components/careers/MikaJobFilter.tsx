"use client";

import { Search, X, Filter, RotateCcw } from "lucide-react";
import type { MikaDepartment, MikaCompany } from "@/types/mika-career";

interface MikaJobFilterProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCompany: string;
  onCompanyChange: (val: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (val: string) => void;
  selectedEmploymentType: string;
  onEmploymentTypeChange: (val: string) => void;
  companies: MikaCompany[];
  departments: MikaDepartment[];
  onReset: () => void;
  totalResults: number;
}

const EMPLOYMENT_TYPES = [
  { label: "Semua Tipe", value: "all" },
  { label: "Full-time", value: "Full-time" },
  { label: "Internship", value: "Internship" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
];

export default function MikaJobFilter({
  searchQuery,
  onSearchChange,
  selectedCompany,
  onCompanyChange,
  selectedDepartment,
  onDepartmentChange,
  selectedEmploymentType,
  onEmploymentTypeChange,
  companies,
  departments,
  onReset,
  totalResults,
}: MikaJobFilterProps) {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCompany !== "all" ||
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
          aria-label="Cari lowongan pekerjaan"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari posisi pekerjaan, skill (Next.js, IoT, Sales), atau kata kunci..."
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
            title="Hapus pencarian"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
        {/* Company Filter (1st) */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            Perusahaan
          </label>
          <div className="relative">
            <select
              aria-label="Filter perusahaan"
              value={selectedCompany}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:border-[#0EA5A0] appearance-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
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

        {/* Department Filter (2nd) */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            Departemen
          </label>
          <div className="relative">
            <select
              aria-label="Filter departemen"
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all focus:outline-none focus:border-[#0EA5A0] appearance-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Semua Departemen</option>
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
            Tipe Pekerjaan
          </label>
          <div className="relative">
            <select
              aria-label="Filter tipe pekerjaan"
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
                  {type.label}
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
            Menampilkan <strong style={{ color: "var(--text-primary)" }}>{totalResults}</strong> posisi lowongan
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
          >
            <RotateCcw size={12} />
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
}
