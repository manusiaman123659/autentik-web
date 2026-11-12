import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").max(254, "Email terlalu panjang").email("Format email tidak valid"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128, "Kata sandi maksimal 128 karakter"),
  confirmPassword: z.string().max(128),
}).refine(value => value.password === value.confirmPassword, { message: "Konfirmasi kata sandi tidak cocok", path: ["confirmPassword"] });

export const customerResetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Tautan reset tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128, "Kata sandi maksimal 128 karakter"),
  confirmPassword: z.string().max(128),
}).refine(value => value.password === value.confirmPassword, { message: "Konfirmasi kata sandi tidak cocok", path: ["confirmPassword"] });
