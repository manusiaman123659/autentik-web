import { z } from "zod";
import { urlOrEmpty } from "@/lib/validations/relasiSchema";

export const DISTRIBUTION_TYPES = [
  "group_distribution",
  "distributor",
  "sub_distributor",
] as const;

export type DistributionType = (typeof DISTRIBUTION_TYPES)[number];

export const DISTRIBUTION_TYPE_LABELS: Record<DistributionType, string> = {
  group_distribution: "Kanal Distribusi Grup",
  distributor: "Distributor",
  sub_distributor: "Sub-distributor",
};

const optionalText = (max: number) => z.string().trim().max(max).default("");
const imageUrlOrEmpty = z.string().trim().max(2000).default("").refine(
  (value) => value === "" || value.startsWith("/") || /^https?:\/\/.+/.test(value),
  "Logo harus berupa path internal atau URL http(s)",
);

export const distributionEntitySchema = z.object({
  id: z.union([z.string().uuid("ID jaringan tidak valid"), z.literal("")]).default(""),
  name: z.string().trim().min(2, "Nama perusahaan minimal 2 karakter").max(200),
  legalName: optionalText(200),
  shortName: optionalText(100),
  distributionType: z.enum(DISTRIBUTION_TYPES, "Tipe jaringan tidak valid"),
  parentId: z.union([z.string().uuid("Parent distributor tidak valid"), z.literal("")]).default(""),
  marketSegment: optionalText(200),
  regionLabel: optionalText(120),
  city: optionalText(120),
  province: optionalText(120),
  address: optionalText(1000),
  phone: optionalText(50),
  email: z.union([z.string().trim().email("Format email tidak valid"), z.literal("")]).default(""),
  websiteUrl: urlOrEmpty,
  contactName: optionalText(150),
  logoUrl: imageUrlOrEmpty,
  description: optionalText(1000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
}).refine((value) => !value.id || value.id !== value.parentId, {
  path: ["parentId"],
  message: "Entitas tidak dapat menjadi parent untuk dirinya sendiri",
});

export const distributionEntityIdSchema = z.string().uuid("ID jaringan tidak valid");

export const distributionEntityToggleSchema = z.object({
  id: distributionEntityIdSchema,
  isActive: z.boolean(),
});

export type DistributionEntityFormValues = z.infer<typeof distributionEntitySchema>;
