import { z } from "zod";

export const csChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(1000, "Pesan maksimal 1000 karakter"),
});

export type CsChatMessageFormData = z.infer<typeof csChatMessageSchema>;
