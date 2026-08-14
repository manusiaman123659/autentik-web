import { z } from "zod";

export const recruitmentSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https?:\/\/.+/.test(v),
      "URL wajib diawali https:// — kosongkan untuk menonaktifkan tombol lamaran"
    ),
});

export type RecruitmentFormValues = z.infer<typeof recruitmentSchema>;