import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";

export async function recordAudit(
  action: string,
  entityType: string,
  entityId?: string,
  details?: unknown
): Promise<void> {
  try {
    const admin = await getAdminUser();
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from("audit_log").insert({
      user_id: admin?.id ?? null,
      user_email: admin?.email ?? "",
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? null,
    });
  } catch (err) {
    console.error("[audit] gagal mencatat aktivitas", err);
  }
}