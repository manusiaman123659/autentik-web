/**
 * PT Autentik Karya Analitika — Design System Tokens
 * Single Source of Truth for Colors, Badges, and Visual Hierarchy.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Background Hierarchy
    bgNavyDark: "#050D1A",
    bgNavyPrimary: "#0B1F3A",
    bgNavyCard: "#132A4A",

    // Single "Talking" Primary Accent
    accentTeal: "#14B8A6",
    accentTealHover: "#0D9E98",
    accentTealMuted: "rgba(20, 184, 166, 0.12)",
    accentTealBorder: "rgba(20, 184, 166, 0.25)",

    // Typography
    textHeading: "#FFFFFF",
    textBody: "#94A3B8",
    textMuted: "#64748B",

    // Structural Borders
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    borderMedium: "rgba(255, 255, 255, 0.15)",
  },
  badges: {
    // Neutral Badge for categories (HSE, ENV, Platform, Lab) and brand tags
    categoryNeutral:
      "bg-[#132A4A] border border-slate-700/60 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full",
    // Unified Pill Tag for Hero & Section Highlights
    pillTag:
      "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-xs font-semibold uppercase tracking-wider",
  },
};
