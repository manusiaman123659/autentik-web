import { z } from "zod";

export const customerLoginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type CustomerLoginFormData = z.infer<typeof customerLoginSchema>;

export const customerRegisterSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  phone: z.string(),
});

export type CustomerRegisterFormData = z.infer<typeof customerRegisterSchema>;

export function validateRegister(data: CustomerRegisterFormData): string | null {
  if (data.password !== data.confirmPassword) {
    return "Kata sandi tidak cocok";
  }
  return null;
}
