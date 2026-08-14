import { z } from "zod";

export const urlOrEmpty = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v), {
    message: "URL wajib diawali https:// — kosongkan jika belum ada",
  });

export const roleColors = ["teal", "green", "amber", "red", "blue", "slate"] as const;

export const teamMemberSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  role: z.string().trim().min(1, "Jabatan wajib diisi"),
  roleColor: z.enum(roleColors, "Warna jabatan tidak valid"),
  bio: z.string().trim().default(""),
  imageUrl: z.string().default(""),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const groupCompanySchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama grup wajib diisi"),
  legalName: z.string().trim().default(""),
  logoUrl: z.string().default(""),
  url: urlOrEmpty,
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const partnerSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama partner wajib diisi"),
  shortName: z.string().trim().default(""),
  logoUrl: z.string().default(""),
  url: urlOrEmpty,
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;
export type GroupCompanyFormValues = z.infer<typeof groupCompanySchema>;
export type PartnerFormValues = z.infer<typeof partnerSchema>;
