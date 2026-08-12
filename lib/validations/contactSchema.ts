import { z } from "zod";

export const contactSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  company: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  industry: z.string().min(1, "Pilih industri Anda"),
  message: z.string().min(10, "Pesan minimal 10 karakter"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const customRequestSchema = z.object({
  category: z.literal("custom_request"),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  company: z.string().optional(),
  message: z.string().min(10, "Jelaskan kebutuhan custom minimal 10 karakter"),
  productSlug: z.string().optional(),
  productName: z.string().optional(),
});

export type CustomRequestFormData = z.infer<typeof customRequestSchema>;

export const contactOrCustomSchema = z.union([contactSchema, customRequestSchema]);
export type ContactOrCustomFormData = z.infer<typeof contactOrCustomSchema>;
