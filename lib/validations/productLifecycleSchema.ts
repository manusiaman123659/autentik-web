import { z } from "zod";
import { productIdSchema } from "@/lib/validations/productSchema";

export const productLifecycleInputSchema = z.object({
  productId: productIdSchema,
  expectedVersion: z.number().int().min(0).max(2147483646),
  requestId: z.string().uuid().transform((value) => value.toLowerCase()),
}).strict();

export type ProductLifecycleInput = z.infer<typeof productLifecycleInputSchema>;
export type ProductLifecycleRequest = Omit<ProductLifecycleInput, "productId">;
export type ProductLifecycleAction =
  | "archive"
  | "trash"
  | "restore_to_archive"
  | "restore_to_draft";

export const productLifecycleRowSchema = z.object({
  id: productIdSchema,
  slug: z.string().min(1),
  product_type: z.enum(["b2b_system", "sparepart"]),
  deleted_at: z.string().min(1).nullable(),
  trashed_at: z.string().min(1).nullable(),
  lifecycle_version: z.number().int().min(0).max(2147483647),
}).refine((row) => row.trashed_at === null || row.deleted_at !== null);

export const productLifecycleReceiptSchema = z.object({
  product_id: productIdSchema,
  product_type: z.enum(["b2b_system", "sparepart"]),
  slug: z.string().min(1),
  state: z.enum(["ACTIVE", "ARCHIVED", "TRASHED"]),
  lifecycle_version: z.number().int().min(0).max(2147483647),
  status: z.enum(["draft", "published"]),
  is_active: z.boolean(),
  is_store_visible: z.boolean().optional(),
  applied: z.boolean(),
  request_id: z.string().uuid(),
  action: z.enum(["archive", "trash", "restore_to_archive", "restore_to_draft"]),
});
