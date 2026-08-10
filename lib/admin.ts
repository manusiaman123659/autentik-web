import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { AdminUser } from "@/lib/admin-sections";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";

export type { AdminUser };
export { ADMIN_SECTIONS };

export const getAdminUser = cache(
  async (): Promise<AdminUser | null> => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.is_active !== true ||
      (profile.role !== "admin" && profile.role !== "editor")
    ) {
      return null;
    }

    return {
      id: user.id,
      email: profile.email ?? user.email ?? "",
      fullName: profile.full_name,
      role: profile.role,
    };
  }
);