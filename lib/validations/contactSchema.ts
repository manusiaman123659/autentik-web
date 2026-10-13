import { z } from "zod";

const contactMessages = {
  fullName: "Nama lengkap minimal 2 karakter", email: "Format email tidak valid",
  company: "Nama perusahaan minimal 2 karakter", industry: "Pilih industri Anda", message: "Pesan minimal 10 karakter",
};

export function createContactSchema(messages: typeof contactMessages = contactMessages) {
  return z.object({
    fullName: z.string().min(2, messages.fullName),
    email: z.string().email(messages.email),
    company: z.string().min(2, messages.company),
    industry: z.string().min(1, messages.industry),
    message: z.string().min(10, messages.message),
  });
}

export const contactSchema = createContactSchema();

export type ContactFormData = z.infer<typeof contactSchema>;

const customMessages = { fullName: contactMessages.fullName, email: contactMessages.email, message: "Jelaskan kebutuhan custom minimal 10 karakter" };

export function createCustomRequestSchema(messages: typeof customMessages = customMessages) {
  return z.object({
    category: z.literal("custom_request"),
    fullName: z.string().min(2, messages.fullName),
    email: z.string().email(messages.email),
    company: z.string().optional(),
    message: z.string().min(10, messages.message),
    productSlug: z.string().optional(),
    productName: z.string().optional(),
  });
}

export const customRequestSchema = createCustomRequestSchema();

export type CustomRequestFormData = z.infer<typeof customRequestSchema>;

export const contactOrCustomSchema = z.union([contactSchema, customRequestSchema]);
export type ContactOrCustomFormData = z.infer<typeof contactOrCustomSchema>;
