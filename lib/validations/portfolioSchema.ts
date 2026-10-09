import { z } from "zod";
import { PORTFOLIO_KINDS } from "@/lib/portfolio-types";
import { safePortfolioImageUrl } from "@/lib/portfolio-media";

const optionalText = (max: number) => z.string().max(max, `Maksimal ${max} karakter`).nullable().optional()
  .transform((value) => value == null || !value.trim() ? null : value);

export const portfolioIdSchema = z.string().uuid("ID entri tidak valid");
export const portfolioStatusSchema = z.enum(["draft", "published"], "Status tidak valid");
export const portfolioSchema = z.object({
  id: portfolioIdSchema.optional(),
  title: z.string().max(160, "Judul maksimal 160 karakter").refine(value => Boolean(value.trim()), "Judul wajib diisi"),
  summary: z.string().max(500, "Ringkasan maksimal 500 karakter").default(""),
  description: z.string().max(10000, "Deskripsi maksimal 10.000 karakter").default(""),
  entryKind: z.enum(PORTFOLIO_KINDS, "Jenis tampilan tidak valid").default("portfolio"),
  categoryLabel: optionalText(80), organizationName: optionalText(200),
  imageUrl: optionalText(2048).refine(value => value === null || safePortfolioImageUrl(value) !== null, "Gunakan gambar portfolio yang diunggah ke media AKA"),
  imageAlt: optionalText(200), imageCaption: optionalText(300), sourceReference: optionalText(300),
  status: portfolioStatusSchema.default("draft"),
  sortOrder: z.number().int("Urutan harus bilangan bulat").min(0).max(9999).default(0),
}).superRefine((value, ctx) => {
  if (value.status === "published" && !value.summary.trim()) ctx.addIssue({ code: "custom", path: ["summary"], message: "Ringkasan wajib diisi untuk publikasi" });
  if (value.status === "published" && value.imageUrl && !value.imageAlt?.trim()) ctx.addIssue({ code: "custom", path: ["imageAlt"], message: "Teks alternatif gambar wajib diisi untuk publikasi" });
});
export type PortfolioInput = z.input<typeof portfolioSchema>;
