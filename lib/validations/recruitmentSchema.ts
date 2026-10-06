import { z } from "zod";
import { getSafeRecruitmentUrl } from "@/lib/recruitment-url";

export const recruitmentSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || getSafeRecruitmentUrl(v) !== null,
      "URL wajib HTTPS pada recruitment.tekna.id tanpa kredensial — kosongkan untuk menonaktifkan tautan cadangan"
    ),
});

export type RecruitmentFormValues = z.infer<typeof recruitmentSchema>;
