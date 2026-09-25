import { z } from "zod";

export const midtransProviderFingerprintSchema = z.object({
  transactionStatus: z.string().trim().min(1).max(50).transform((value) => value.toLowerCase()),
  transactionId: z.string().trim().min(1).max(200),
  grossAmount: z.string().regex(/^\d+\.\d{2}$/, "Nominal provider tidak valid"),
  paymentType: z.string().trim().min(1).max(100).transform((value) => value.toLowerCase()),
  fraudStatus: z.string().trim().min(1).max(50).transform((value) => value.toLowerCase()).nullable(),
}).strict();

export const midtransReconciliationSchema = z.object({
  orderId: z.string().uuid("ID pesanan tidak valid"),
  expectedFingerprint: midtransProviderFingerprintSchema,
}).strict();
