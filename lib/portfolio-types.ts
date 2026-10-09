export const PORTFOLIO_KINDS = ["portfolio", "collaboration", "trademark"] as const;
export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];
export const PORTFOLIO_KIND_LABELS: Record<PortfolioKind, string> = {
  portfolio: "Portofolio", collaboration: "Kolaborasi", trademark: "Merek Terdaftar",
};
export type PortfolioStatus = "draft" | "published";

export interface PortfolioRow {
  id: string;
  title: string;
  summary: string;
  description: string;
  entry_kind: PortfolioKind;
  category_label: string | null;
  organization_name: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_caption: string | null;
  source_reference: string | null;
  status: PortfolioStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PublicPortfolio = Omit<PortfolioRow, "source_reference" | "status" | "created_at" | "updated_at">;
