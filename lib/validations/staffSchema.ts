import { z } from "zod";
import { isCmsRole, type CmsRole } from "@/lib/admin-permissions";

const role = z.string().refine(isCmsRole, "Peran CMS tidak valid").transform((value) => value as CmsRole);
const reason = z.string().trim().max(500, "Alasan maksimal 500 karakter").default("");
export const manageStaffSchema = z.object({
  targetId: z.string().uuid("ID akun tidak valid"),
  role,
  isActive: z.boolean(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  reason,
}).strict();
export const provisionStaffSchema = z.object({
  targetId: z.string().uuid("ID akun tidak valid"), role, reason,
}).strict();
export const staffLookupSchema = z.object({ email: z.string().trim().email("Email tidak valid").max(254) }).strict();

export interface StaffCandidate {
  id: string;
  full_name: string | null;
  email: string;
  role: "customer";
  is_active: boolean;
  updated_at: string | null;
}
