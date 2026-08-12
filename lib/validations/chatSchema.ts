import { z } from "zod";

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(500, "Pesan maksimal 500 karakter"),
});

export type ChatFormData = z.infer<typeof chatSchema>;