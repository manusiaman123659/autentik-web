import { z } from "zod";

export const contactSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  company: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  industry: z.string().min(1, "Pilih industri Anda"),
  message: z.string().min(10, "Pesan minimal 10 karakter"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
