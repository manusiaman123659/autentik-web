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

    let authData;
    try {
      const result = await supabase.auth.getUser();
      authData = result.data;
    } catch (err) {
      // Refresh token expired/invalid → return null
      // Caller (layout.tsx) akan redirect ke /admin/login
      if (err && typeof err === "object" && "code" in err && err.code !== "refresh_token_not_found") {
        console.error("[getAdminUser] unexpected auth error:", err);
      }
      return null;
    }
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