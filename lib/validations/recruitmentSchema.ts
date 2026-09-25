import { z } from "zod";
import { getSafeExternalUrl } from "@/lib/public-url";

export const recruitmentSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || getSafeExternalUrl(v) !== null,
      "URL wajib berupa alamat HTTP(S) yang aman — kosongkan untuk menonaktifkan tombol lamaran"
    ),
});

export type RecruitmentFormValues = z.infer<typeof recruitmentSchema>;
