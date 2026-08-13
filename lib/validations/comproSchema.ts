import { z } from "zod";

export const comproSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi"),
  year: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v), "Tahun harus 4 digit (mis. 2026)")
    .optional()
    .nullable(),
  pdfUrl: z.string().url("URL PDF tidak valid").optional().nullable(),
  pdfFilename: z.string().trim().optional().nullable(),
});

export type ComproFormValues = z.infer<typeof comproSchema>;
export type ComproSettings = {
  title: string;
  year?: string | null;
  pdfUrl?: string | null;
  pdfFilename?: string | null;
};